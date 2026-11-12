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

import { parsePricingSearch } from '../route-search'

describe('pricing route search', () => {
  it('drops removed discount and quota type filters while preserving supported values', () => {
    const search = parsePricingSearch({
      search: 'gpt',
      vendor: 'OpenAI',
      discount: 'discounted',
      quotaType: 'token',
      endpointType: 'openai',
      tag: 'chat',
      tokenUnit: 'K',
      view: 'table',
      rechargePrice: true,
    })

    expect(search).not.toHaveProperty('discount')
    expect(search).not.toHaveProperty('quotaType')
    expect(search).toMatchObject({
      search: 'gpt',
      vendor: 'OpenAI',
      endpointType: 'openai',
      tag: 'chat',
      tokenUnit: 'K',
      view: 'table',
      rechargePrice: true,
    })
  })
})
