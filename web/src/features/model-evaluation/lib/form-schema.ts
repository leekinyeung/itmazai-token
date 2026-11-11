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
import { z } from 'zod'

export const modelEvaluationFormSchema = z.object({
  baseUrl: z
    .string()
    .trim()
    .min(1, 'Base URL is required')
    .url('Enter a valid Base URL')
    .refine((value) => ['http:', 'https:'].includes(new URL(value).protocol), {
      message: 'Enter a valid Base URL',
    })
    .refine(
      (value) => new URL(value).pathname.replace(/\/+$/, '').endsWith('/v1'),
      {
        message: 'Base URL must include the /v1 path',
      }
    ),
  apiKey: z.string().trim().min(1, 'API key is required'),
  targetModel: z.string().trim().min(1, 'Target model is required').max(512),
  judgeModel: z.string().trim().min(1, 'Judge model is required').max(512),
})

export const modelEvaluationDefaultValues = {
  baseUrl: '',
  apiKey: '',
  targetModel: '',
  judgeModel: '',
}
