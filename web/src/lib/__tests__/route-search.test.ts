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
import { describe, expect, it } from 'vitest'

import {
  optionalSearchBoolean,
  optionalSearchEnum,
  optionalSearchNumber,
  optionalSearchString,
  searchNumber,
  searchString,
  searchStringArray,
} from '@/lib/route-search'

describe('route search parsing', () => {
  it('keeps absent optional values absent and rejects invalid scalar types', () => {
    expect(optionalSearchString(undefined)).toBeUndefined()
    expect(optionalSearchString(1)).toBeUndefined()
    expect(optionalSearchNumber(Number.NaN)).toBeUndefined()
    expect(optionalSearchNumber(5)).toBe(5)
    expect(optionalSearchBoolean('true')).toBeUndefined()
    expect(optionalSearchBoolean(false)).toBe(false)
  })

  it('applies catch values only to present invalid values', () => {
    expect(searchString(undefined)).toBeUndefined()
    expect(searchString(null)).toBe('')
    expect(searchNumber(undefined, 1)).toBeUndefined()
    expect(searchNumber('1', 1)).toBe(1)
  })

  it('validates arrays and enum members as a whole', () => {
    const allowed = new Set(['active', 'disabled'] as const)
    expect(searchStringArray(undefined, allowed)).toBeUndefined()
    expect(searchStringArray('active', allowed)).toEqual([])
    expect(searchStringArray(['active', 'other'], allowed)).toEqual([])
    expect(searchStringArray(['active'], allowed)).toEqual(['active'])
    expect(optionalSearchEnum('disabled', allowed)).toBe('disabled')
    expect(optionalSearchEnum('other', allowed)).toBeUndefined()
  })
})
