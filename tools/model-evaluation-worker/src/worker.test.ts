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

import { describe, expect, setDefaultTimeout, test } from 'bun:test'

setDefaultTimeout(30_000)

function spawnWorker() {
  return Bun.spawn([process.execPath, 'src/bootstrap.ts'], {
    cwd: new URL('..', import.meta.url).pathname,
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      CONFIDENT_OPEN_BROWSER: '0',
      CONFIDENT_TRACING_ENABLED: '0',
      DEEPEVAL_DISABLE_DOTENV: '1',
      DEEPEVAL_FILE_SYSTEM: 'READ_ONLY',
      DEEPEVAL_TELEMETRY_OPT_OUT: '1',
      ENABLE_DEEPEVAL_CACHE: '0',
    },
  })
}

function lineReader(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffered = ''

  return async () => {
    while (!buffered.includes('\n')) {
      const chunk = await reader.read()
      if (chunk.done) throw new Error('Worker output closed before a result')
      buffered += decoder.decode(chunk.value, { stream: true })
    }
    const newline = buffered.indexOf('\n')
    const line = buffered.slice(0, newline)
    buffered = buffered.slice(newline + 1)
    return JSON.parse(line) as Record<string, unknown>
  }
}

function judgeOutput(prompt: string): object {
  if (prompt.includes('"statements" key')) {
    return { statements: ['Paris is the capital of France.'] }
  }
  if (prompt.includes('provided list of statements')) {
    return { verdicts: [{ verdict: 'yes' }] }
  }
  if (prompt.includes('answer relevancy score')) {
    return { reason: 'The response directly answers the question.' }
  }
  if (prompt.includes('"steps" key')) {
    return { steps: ['Compare the response with the reference answer.'] }
  }
  if (prompt.includes('You are an evaluator.')) {
    return { score: 9, reason: 'The response matches the reference answer.' }
  }
  if (prompt.includes('"truths" key')) {
    return { truths: ['Paris is the capital of France.'] }
  }
  if (prompt.includes('"claims" key')) {
    return { claims: ['Paris is the capital of France.'] }
  }
  if (prompt.includes('Based on the given claims')) {
    return { verdicts: [{ verdict: 'yes' }] }
  }
  if (prompt.includes('Below is a list of Contradictions')) {
    return { reason: 'The response is fully supported by the context.' }
  }
  throw new Error('Unexpected judge prompt')
}

async function writeMessage(
  worker: ReturnType<typeof spawnWorker>,
  message: object
) {
  worker.stdin.write(`${JSON.stringify(message)}\n`)
  await worker.stdin.flush()
}

describe('DeepEval worker', () => {
  test('runs all selected metrics over correlated JSONL judge requests', async () => {
    const worker = spawnWorker()
    const readMessage = lineReader(worker.stdout)
    await writeMessage(worker, {
      type: 'start',
      input: 'What is the capital of France?',
      actualOutput: 'Paris is the capital of France.',
      expectedOutput: 'Paris is the capital of France.',
      retrievalContext: 'Paris is the capital and largest city of France.',
      judgeModel: 'mock-judge',
    })

    const completedMetrics: string[] = []
    let completed: Record<string, unknown> | undefined
    for (let messageCount = 0; messageCount < 30; messageCount += 1) {
      const message = await readMessage()
      if (message.type === 'judge_request') {
        await writeMessage(worker, {
          type: 'judge_response',
          requestId: message.requestId,
          output: JSON.stringify(judgeOutput(String(message.prompt))),
        })
      } else if (message.type === 'metric_completed') {
        completedMetrics.push(String(message.metric))
      } else if (message.type === 'completed') {
        completed = message
        break
      } else if (message.type === 'error') {
        throw new Error(`Worker failed: ${String(message.code)}`)
      }
    }

    expect(completedMetrics).toEqual([
      'answer_relevancy',
      'correctness',
      'faithfulness',
    ])
    expect(completed?.passed).toBe(true)
    worker.stdin.end()
    expect(await worker.exited).toBe(0)
  })

  test('maps a browser judge failure to a safe error', async () => {
    const worker = spawnWorker()
    const readMessage = lineReader(worker.stdout)
    await writeMessage(worker, {
      type: 'start',
      input: 'Question',
      actualOutput: 'Answer',
      judgeModel: 'mock-judge',
    })

    expect((await readMessage()).type).toBe('metric_started')
    const request = await readMessage()
    expect(request.type).toBe('judge_request')
    await writeMessage(worker, {
      type: 'judge_response',
      requestId: request.requestId,
      error: { code: 'MODEL_REQUEST_FAILED' },
    })
    expect(await readMessage()).toMatchObject({
      type: 'error',
      code: 'JUDGE_REQUEST_FAILED',
      retryable: true,
    })
    worker.stdin.end()
    expect(await worker.exited).toBe(0)
  })

  test('exits cleanly when cancelled', async () => {
    const worker = spawnWorker()
    await writeMessage(worker, { type: 'cancel' })
    expect(await worker.exited).toBe(0)
  })
})
