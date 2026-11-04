/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import { createInterface } from 'node:readline'

import {
  AnswerRelevancyMetric,
  FaithfulnessMetric,
  GEval,
} from 'deepeval/metrics'
import { DeepEvalBaseLLM } from 'deepeval/models'
import type { GenerationResult } from 'deepeval/models'
import { LLMTestCase, SingleTurnParams } from 'deepeval/test-case'
import type { ZodType } from 'zod'

import {
  METRIC_THRESHOLD,
  parseStructuredOutput,
  selectedMetrics,
  type ClientMessage,
  type JudgeResponseMessage,
  type MetricName,
  type MetricResult,
  type StartMessage,
} from './protocol'

type PendingJudgeRequest = {
  resolve: (output: string) => void
  reject: (error: Error) => void
}

const pendingJudgeRequests = new Map<string, PendingJudgeRequest>()
let requestSequence = 0
let started = false
let currentMetric: MetricName | undefined

function emit(message: object): void {
  process.stdout.write(`${JSON.stringify(message)}\n`)
}

class BrowserRelayModel extends DeepEvalBaseLLM {
  constructor(private readonly judgeModel: string) {
    super(judgeModel)
  }

  async generate<T = string>(
    prompt: string,
    schema?: ZodType<T>
  ): Promise<GenerationResult<T>> {
    const requestId = `judge-${++requestSequence}`
    const output = await new Promise<string>((resolve, reject) => {
      pendingJudgeRequests.set(requestId, { resolve, reject })
      emit({
        type: 'judge_request',
        requestId,
        prompt,
        expectsJson: Boolean(schema),
      })
    })

    return {
      output: schema ? parseStructuredOutput(output, schema) : (output as T),
      cost: null,
    }
  }

  getModelName(): string {
    return this.judgeModel
  }
}

function settleJudgeRequest(message: JudgeResponseMessage): void {
  const pending = pendingJudgeRequests.get(message.requestId)
  if (!pending) return
  pendingJudgeRequests.delete(message.requestId)
  if (message.error) {
    pending.reject(new Error(`JUDGE_REQUEST_FAILED:${message.error.code}`))
    return
  }
  if (typeof message.output !== 'string') {
    pending.reject(new Error('JUDGE_RESPONSE_INVALID'))
    return
  }
  pending.resolve(message.output)
}

async function runMetric(
  name: MetricName,
  testCase: LLMTestCase,
  model: BrowserRelayModel
): Promise<MetricResult> {
  currentMetric = name
  emit({ type: 'metric_started', metric: name })

  let metric: AnswerRelevancyMetric | FaithfulnessMetric | GEval
  if (name === 'answer_relevancy') {
    metric = new AnswerRelevancyMetric({
      threshold: METRIC_THRESHOLD,
      model,
      includeReason: true,
      showIndicator: false,
    })
  } else if (name === 'correctness') {
    metric = new GEval({
      name: 'Correctness',
      criteria:
        'Determine whether the actual output is factually and semantically correct when compared with the expected output.',
      evaluationParams: [
        SingleTurnParams.INPUT,
        SingleTurnParams.ACTUAL_OUTPUT,
        SingleTurnParams.EXPECTED_OUTPUT,
      ],
      threshold: METRIC_THRESHOLD,
      model,
      showIndicator: false,
      includeGEvalSuffix: false,
    })
  } else {
    metric = new FaithfulnessMetric({
      threshold: METRIC_THRESHOLD,
      model,
      includeReason: true,
      showIndicator: false,
    })
  }

  // DeepEval invokes progress/telemetry hooks even when the visual indicator is
  // disabled. This worker deliberately disables both and only emits JSONL.
  const quietMetric = metric as unknown as {
    startProgress: () => Promise<void>
    stopProgress: () => void
  }
  quietMetric.startProgress = async () => {}
  quietMetric.stopProgress = () => {}

  const score = await metric.measure(testCase)
  const result: MetricResult = {
    metric: name,
    score,
    threshold: METRIC_THRESHOLD,
    passed: metric.isSuccessful() === true,
    reason: metric.reason || '',
  }
  emit({ type: 'metric_completed', ...result })
  return result
}

async function runEvaluation(message: StartMessage): Promise<void> {
  const model = new BrowserRelayModel(message.judgeModel)
  const testCase = new LLMTestCase({
    input: message.input,
    actualOutput: message.actualOutput,
    expectedOutput: message.expectedOutput?.trim() || undefined,
    retrievalContext: message.retrievalContext?.trim()
      ? [message.retrievalContext.trim()]
      : undefined,
  })
  const results: MetricResult[] = []
  for (const name of selectedMetrics(message)) {
    results.push(await runMetric(name, testCase, model))
  }
  emit({
    type: 'completed',
    passed: results.every((result) => result.passed),
    metrics: results,
  })
}

function publicError(error: unknown): { code: string; message: string } {
  const text = error instanceof Error ? error.message : ''
  if (text.startsWith('JUDGE_REQUEST_FAILED:')) {
    return {
      code: 'JUDGE_REQUEST_FAILED',
      message: 'The judge model request failed.',
    }
  }
  if (text === 'JUDGE_RESPONSE_INVALID') {
    return {
      code: 'JUDGE_RESPONSE_INVALID',
      message: 'The judge model returned an invalid structured response.',
    }
  }
  return {
    code: 'METRIC_FAILED',
    message: 'DeepEval could not complete the metric.',
  }
}

async function handleMessage(message: ClientMessage): Promise<void> {
  if (message.type === 'judge_response') {
    settleJudgeRequest(message)
    return
  }
  if (message.type === 'cancel') {
    process.exit(0)
  }
  if (message.type !== 'start' || started) return

  started = true
  try {
    await runEvaluation(message)
  } catch (error) {
    const safeError = publicError(error)
    emit({
      type: 'error',
      stage: currentMetric || 'startup',
      code: safeError.code,
      message: safeError.message,
      retryable: safeError.code === 'JUDGE_REQUEST_FAILED',
    })
  }
}

const lines = createInterface({ input: process.stdin, crlfDelay: Infinity })
lines.on('line', (line) => {
  try {
    const message = JSON.parse(line) as ClientMessage
    void handleMessage(message)
  } catch {
    emit({
      type: 'error',
      stage: 'protocol',
      code: 'INVALID_MESSAGE',
      message: 'The worker received an invalid protocol message.',
      retryable: false,
    })
  }
})
