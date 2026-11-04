/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

export function optionalSearchString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

export function searchString(
  value: unknown,
  fallback = ''
): string | undefined {
  if (value === undefined) return undefined
  return optionalSearchString(value) ?? fallback
}

export function optionalSearchNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export function searchNumber(
  value: unknown,
  fallback: number
): number | undefined {
  if (value === undefined) return undefined
  return optionalSearchNumber(value) ?? fallback
}

export function optionalSearchBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

export function optionalSearchEnum<const T extends string>(
  value: unknown,
  allowed: ReadonlySet<T>
): T | undefined {
  return typeof value === 'string' && allowed.has(value as T)
    ? (value as T)
    : undefined
}

export function searchStringArray<const T extends string = string>(
  value: unknown,
  allowed?: ReadonlySet<T>
): T[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) return []
  if (!value.every((item) => typeof item === 'string')) return []
  if (allowed && !value.every((item) => allowed.has(item as T))) return []
  return value as T[]
}
