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

import { describe, expect, test } from 'bun:test'

import { z } from 'zod'

import { parseStructuredOutput, selectedMetrics } from './protocol'

describe('worker protocol', () => {
  test('selects optional metrics only when their inputs are present', () => {
    expect(
      selectedMetrics({
        type: 'start',
        input: 'question',
        actualOutput: 'answer',
        expectedOutput: 'expected',
        retrievalContext: 'source',
        judgeModel: 'judge',
      })
    ).toEqual(['answer_relevancy', 'correctness', 'faithfulness'])
  })

  test('extracts fenced structured judge output', () => {
    const schema = z.object({ score: z.number() })
    expect(
      parseStructuredOutput('```json\n{"score": 0.8}\n```', schema)
    ).toEqual({
      score: 0.8,
    })
  })

  test('rejects text without schema-compatible JSON', () => {
    expect(() =>
      parseStructuredOutput('not json', z.object({ score: z.number() }))
    ).toThrow('JUDGE_RESPONSE_INVALID')
  })
})
