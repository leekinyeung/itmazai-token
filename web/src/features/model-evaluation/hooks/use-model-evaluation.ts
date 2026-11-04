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
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  generateOpenAICompletion,
  modelEvaluationWebSocketUrl,
  ModelEndpointError,
} from '../api'
import { BUILT_IN_EVALUATION_CASE } from '../lib/built-in-evaluation-case'
import type {
  EvaluationMetricName,
  EvaluationMetricState,
  EvaluationRunState,
  ModelEvaluationFormValues,
} from '../types'

const initialState: EvaluationRunState = {
  status: 'idle',
  actualOutput: '',
  metrics: [],
}

type ServerMessage = {
  type: string
  metric?: EvaluationMetricName
  requestId?: string
  prompt?: string
  score?: number
  passed?: boolean
  reason?: string
  metrics?: EvaluationMetricState[]
  code?: string
}

const errorKeys: Record<string, string> = {
  EVALUATION_TIMEOUT: 'The evaluation timed out',
  INVALID_INPUT: 'Evaluation input is invalid',
  JUDGE_REQUEST_FAILED: 'The judge model request failed',
  JUDGE_RESPONSE_INVALID: 'The judge model returned an invalid response',
  MODEL_EVALUATION_BUSY: 'Model evaluation capacity is full',
  MODEL_EVALUATION_UNAVAILABLE: 'Model evaluation is unavailable',
  WORKER_START_FAILED: 'Model evaluation is unavailable',
  WORKER_STOPPED: 'The evaluation worker stopped unexpectedly',
}

export function createMetricStates(): EvaluationMetricState[] {
  return [
    { name: 'answer_relevancy', status: 'pending' },
    { name: 'correctness', status: 'pending' },
    { name: 'faithfulness', status: 'pending' },
  ]
}

export function createEvaluationStartMessage(
  values: ModelEvaluationFormValues,
  actualOutput: string
) {
  return {
    type: 'start' as const,
    input: BUILT_IN_EVALUATION_CASE.input,
    actualOutput,
    expectedOutput: BUILT_IN_EVALUATION_CASE.expectedOutput,
    retrievalContext: BUILT_IN_EVALUATION_CASE.retrievalContext,
    judgeModel: values.judgeModel,
  }
}

function updateMetric(
  metrics: EvaluationMetricState[],
  name: EvaluationMetricName,
  update: Partial<EvaluationMetricState>
): EvaluationMetricState[] {
  return metrics.map((metric) =>
    metric.name === name ? { ...metric, ...update } : metric
  )
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function useModelEvaluation() {
  const [state, setState] = useState<EvaluationRunState>(initialState)
  const abortControllerRef = useRef<AbortController | null>(null)
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(
    () => () => {
      socketRef.current?.close()
      abortControllerRef.current?.abort()
    },
    []
  )

  const cancel = useCallback(() => {
    const socket = socketRef.current
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'cancel' }))
    }
    socket?.close()
    socketRef.current = null
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setState((current) => ({ ...current, status: 'cancelled' }))
  }, [])

  const run = useCallback(async (values: ModelEvaluationFormValues) => {
    const controller = new AbortController()
    abortControllerRef.current = controller
    setState({
      status: 'generating',
      actualOutput: '',
      metrics: createMetricStates(),
    })

    try {
      const actualOutput = await generateOpenAICompletion({
        baseUrl: values.baseUrl,
        apiKey: values.apiKey,
        model: values.targetModel,
        prompt: BUILT_IN_EVALUATION_CASE.input,
        signal: controller.signal,
      })
      setState((current) => ({
        ...current,
        status: 'evaluating',
        actualOutput,
      }))

      await new Promise<void>((resolve, reject) => {
        const socket = new WebSocket(
          modelEvaluationWebSocketUrl(),
          'model-evaluation.v1'
        )
        socketRef.current = socket
        let settled = false
        let judgeRequestError: ModelEndpointError | undefined

        const finish = (error?: Error) => {
          if (settled) return
          settled = true
          socket.close()
          socketRef.current = null
          if (error) reject(error)
          else resolve()
        }

        controller.signal.addEventListener(
          'abort',
          () => finish(new DOMException('Aborted', 'AbortError')),
          { once: true }
        )

        socket.addEventListener('error', () => {
          finish(
            new ModelEndpointError('Unable to connect to model evaluation')
          )
        })
        socket.addEventListener('close', () => {
          if (!settled && !controller.signal.aborted) {
            finish(
              new ModelEndpointError('The evaluation connection closed early')
            )
          }
        })
        socket.addEventListener('message', (event) => {
          void (async () => {
            const message = JSON.parse(String(event.data)) as ServerMessage
            if (message.type === 'ready') {
              socket.send(
                JSON.stringify(
                  createEvaluationStartMessage(values, actualOutput)
                )
              )
              return
            }
            if (message.type === 'judge_request') {
              if (!message.requestId || !message.prompt) return
              try {
                const output = await generateOpenAICompletion({
                  baseUrl: values.baseUrl,
                  apiKey: values.apiKey,
                  model: values.judgeModel,
                  prompt: message.prompt,
                  signal: controller.signal,
                })
                socket.send(
                  JSON.stringify({
                    type: 'judge_response',
                    requestId: message.requestId,
                    output,
                  })
                )
              } catch (error) {
                if (isAbortError(error)) return
                judgeRequestError =
                  error instanceof ModelEndpointError
                    ? error
                    : new ModelEndpointError('The judge model request failed')
                socket.send(
                  JSON.stringify({
                    type: 'judge_response',
                    requestId: message.requestId,
                    error: { code: 'MODEL_REQUEST_FAILED' },
                  })
                )
              }
              return
            }
            if (message.type === 'metric_started' && message.metric) {
              const metric = message.metric
              setState((current) => ({
                ...current,
                metrics: updateMetric(current.metrics, metric, {
                  status: 'running',
                }),
              }))
              return
            }
            if (
              message.type === 'metric_completed' &&
              message.metric &&
              typeof message.score === 'number'
            ) {
              const metric = message.metric
              setState((current) => ({
                ...current,
                metrics: updateMetric(current.metrics, metric, {
                  status: message.passed ? 'passed' : 'failed',
                  score: message.score,
                  reason: message.reason || '',
                }),
              }))
              return
            }
            if (message.type === 'completed') {
              setState((current) => ({
                ...current,
                status: 'completed',
                overallPassed: message.passed === true,
              }))
              finish()
              return
            }
            if (message.type === 'error') {
              if (
                message.code === 'JUDGE_REQUEST_FAILED' &&
                judgeRequestError
              ) {
                finish(judgeRequestError)
                return
              }
              const key =
                errorKeys[message.code || ''] || 'Model evaluation failed'
              finish(new ModelEndpointError(key))
            }
          })().catch(() => {
            finish(new ModelEndpointError('Model evaluation failed'))
          })
        })
      })
    } catch (error) {
      if (isAbortError(error)) {
        setState((current) => ({ ...current, status: 'cancelled' }))
      } else {
        const errorKey =
          error instanceof ModelEndpointError
            ? error.translationKey
            : 'Model evaluation failed'
        const errorDetail =
          error instanceof ModelEndpointError ? error.detail : undefined
        setState((current) => ({
          ...current,
          status: 'error',
          errorKey,
          errorDetail,
        }))
      }
    } finally {
      abortControllerRef.current = null
      socketRef.current = null
    }
  }, [])

  return {
    state,
    run,
    cancel,
    running: state.status === 'generating' || state.status === 'evaluating',
  }
}
