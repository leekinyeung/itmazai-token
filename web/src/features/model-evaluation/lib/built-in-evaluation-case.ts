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
export const BUILT_IN_EVALUATION_CASE = {
  id: 'standard-factual-qa',
  input: `Use only the reference passage to answer the question in one concise sentence.

Reference passage:
The Aster lab has 12 blue sensors and 7 green sensors.

Question:
How many sensors does the Aster lab have in total?`,
  expectedOutput: 'The Aster lab has 19 sensors in total.',
  retrievalContext: 'The Aster lab has 12 blue sensors and 7 green sensors.',
} as const
