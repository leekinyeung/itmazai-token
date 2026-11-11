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
export type ModelEvaluationFormValues = {
  baseUrl: string
  apiKey: string
  targetModel: string
  judgeModel: string
}

export type EvaluationMetricName =
  | 'answer_relevancy'
  | 'correctness'
  | 'faithfulness'

export type EvaluationMetricStatus =
  | 'pending'
  | 'running'
  | 'passed'
  | 'failed'
  | 'skipped'

export type EvaluationMetricState = {
  name: EvaluationMetricName
  status: EvaluationMetricStatus
  score?: number
  threshold?: number
  reason?: string
}

export type EvaluationRunStatus =
  | 'idle'
  | 'generating'
  | 'evaluating'
  | 'completed'
  | 'cancelled'
  | 'error'

export type EvaluationRunState = {
  status: EvaluationRunStatus
  actualOutput: string
  metrics: EvaluationMetricState[]
  overallPassed?: boolean
  errorKey?: string
  errorDetail?: string
}

export type ModelOption = {
  label: string
  value: string
}
