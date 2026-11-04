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
import { createFileRoute, redirect } from '@tanstack/react-router'

import { Models } from '@/features/models'
import {
  MODELS_DEFAULT_SECTION,
  MODELS_SECTION_IDS,
} from '@/features/models/route-constants'
import { ROLE } from '@/lib/roles'
import {
  searchNumber,
  searchString,
  searchStringArray,
} from '@/lib/route-search'
import { useAuthStore } from '@/stores/auth-store'

const SQUARE_STATE_VALUES = new Set([
  'visible',
  'unavailable',
  'hidden',
  'partial',
] as const)

export const Route = createFileRoute('/_authenticated/admin/models/$section')({
  beforeLoad: ({ params }) => {
    const { auth } = useAuthStore.getState()

    if (!auth.user || auth.user.role < ROLE.ADMIN) {
      throw redirect({
        to: '/403',
      })
    }

    if (!(MODELS_SECTION_IDS as readonly string[]).includes(params.section)) {
      throw redirect({
        to: '/admin/models/$section',
        params: { section: MODELS_DEFAULT_SECTION },
      })
    }
  },
  validateSearch: (
    search
  ): {
    vPage?: number
    vPageSize?: number
    vFilter?: string
    vAssociation?: string[]
    page?: number
    pageSize?: number
    filter?: string
    vendor?: string[]
    status?: string[]
    square_state?: ('visible' | 'unavailable' | 'hidden' | 'partial')[]
    sync?: string[]
    dPage?: number
    dPageSize?: number
    dFilter?: string
    dStatus?: string[]
  } => ({
    vPage: searchNumber(search.vPage, 1),
    vPageSize: searchNumber(search.vPageSize, 20),
    vFilter: searchString(search.vFilter),
    vAssociation: searchStringArray(search.vAssociation),
    page: searchNumber(search.page, 1),
    pageSize: searchNumber(search.pageSize, 10),
    filter: searchString(search.filter),
    vendor: searchStringArray(search.vendor),
    status: searchStringArray(search.status),
    square_state: searchStringArray(search.square_state, SQUARE_STATE_VALUES),
    sync: searchStringArray(search.sync),
    dPage: searchNumber(search.dPage, 1),
    dPageSize: searchNumber(search.dPageSize, 10),
    dFilter: searchString(search.dFilter),
    dStatus: searchStringArray(search.dStatus),
  }),
  component: Models,
})
