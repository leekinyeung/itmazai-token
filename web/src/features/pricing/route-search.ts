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
import {
  optionalSearchBoolean,
  optionalSearchEnum,
  optionalSearchString,
} from '@/lib/route-search'

const TOKEN_UNITS = new Set(['M', 'K'] as const)
const VIEW_MODES = new Set(['card', 'table'] as const)
const DISCOUNT_FILTERS = new Set(['discounted', 'standard'] as const)

export type PricingRouteSearch = {
  search?: string
  sort?: string
  vendor?: string
  group?: string
  discount?: 'discounted' | 'standard'
  quotaType?: string
  endpointType?: string
  tag?: string
  tokenUnit?: 'M' | 'K'
  view?: 'card' | 'table'
  rechargePrice?: boolean
}

export function parsePricingSearch(
  search: Record<string, unknown>
): PricingRouteSearch {
  return {
    search: optionalSearchString(search.search),
    sort: optionalSearchString(search.sort),
    vendor: optionalSearchString(search.vendor),
    group: optionalSearchString(search.group),
    discount: optionalSearchEnum(search.discount, DISCOUNT_FILTERS),
    quotaType: optionalSearchString(search.quotaType),
    endpointType: optionalSearchString(search.endpointType),
    tag: optionalSearchString(search.tag),
    tokenUnit: optionalSearchEnum(search.tokenUnit, TOKEN_UNITS),
    view: optionalSearchEnum(search.view, VIEW_MODES),
    rechargePrice: optionalSearchBoolean(search.rechargePrice),
  }
}
