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

import type { ZodType } from 'zod'

export const METRIC_THRESHOLD = 0.5

export type StartMessage = {
  type: 'start'
  input: string
  actualOutput: string
  expectedOutput?: string
  retrievalContext?: string
  judgeModel: string
}

export type JudgeResponseMessage = {
  type: 'judge_response'
  requestId: string
  output?: string
  error?: {
    code: string
  }
}

export type ClientMessage =
  | StartMessage
  | JudgeResponseMessage
  | { type: 'cancel' }

export type MetricName = 'answer_relevancy' | 'correctness' | 'faithfulness'

export type MetricResult = {
  metric: MetricName
  score: number
  threshold: number
  passed: boolean
  reason: string
}

export function parseStructuredOutput<T>(raw: string, schema: ZodType<T>): T {
  const trimmed = raw.trim()
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  const candidates = [withoutFence]
  const objectStart = withoutFence.indexOf('{')
  const objectEnd = withoutFence.lastIndexOf('}')
  if (objectStart >= 0 && objectEnd > objectStart) {
    candidates.push(withoutFence.slice(objectStart, objectEnd + 1))
  }
  const arrayStart = withoutFence.indexOf('[')
  const arrayEnd = withoutFence.lastIndexOf(']')
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    candidates.push(withoutFence.slice(arrayStart, arrayEnd + 1))
  }

  for (const candidate of candidates) {
    try {
      return schema.parse(JSON.parse(candidate))
    } catch {
      // Try the next bounded JSON candidate.
    }
  }
  throw new Error('JUDGE_RESPONSE_INVALID')
}

export function selectedMetrics(message: StartMessage): MetricName[] {
  const metrics: MetricName[] = ['answer_relevancy']
  if (message.expectedOutput?.trim()) metrics.push('correctness')
  if (message.retrievalContext?.trim()) metrics.push('faithfulness')
  return metrics
}
