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

process.env.DEEPEVAL_TELEMETRY_OPT_OUT = '1'
process.env.DEEPEVAL_DISABLE_DOTENV = '1'
process.env.DEEPEVAL_FILE_SYSTEM = 'READ_ONLY'
process.env.CONFIDENT_OPEN_BROWSER = '0'
process.env.CONFIDENT_TRACING_ENABLED = '0'
process.env.ENABLE_DEEPEVAL_CACHE = '0'

console.log = (...args: unknown[]) => console.error(...args)
console.info = (...args: unknown[]) => console.error(...args)
console.warn = (...args: unknown[]) => console.error(...args)

await import('./worker')

export {}
