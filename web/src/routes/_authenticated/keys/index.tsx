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
import { createFileRoute } from '@tanstack/react-router'

import { ApiKeys } from '@/features/keys'
import { API_KEY_STATUS_OPTIONS } from '@/features/keys/constants'
import {
  optionalSearchNumber,
  searchNumber,
  searchString,
  searchStringArray,
} from '@/lib/route-search'

const API_KEY_STATUS_VALUES = new Set(
  API_KEY_STATUS_OPTIONS.map((status) => status.value as `${number}`)
)

export const Route = createFileRoute('/_authenticated/keys/')({
  validateSearch: (
    search
  ): {
    page?: number
    pageSize?: number
    status?: `${number}`[]
    filter?: string
    token?: string
  } => ({
    page: searchNumber(search.page, 1),
    pageSize: optionalSearchNumber(search.pageSize),
    status: searchStringArray(search.status, API_KEY_STATUS_VALUES),
    filter: searchString(search.filter),
    token: searchString(search.token),
  }),
  component: ApiKeys,
})
