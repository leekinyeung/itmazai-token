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
import { createFileRoute, redirect } from '@tanstack/react-router'

import { Users } from '@/features/users'
import { ROLE } from '@/lib/roles'
import {
  optionalSearchNumber,
  searchNumber,
  searchString,
  searchStringArray,
} from '@/lib/route-search'
import { useAuthStore } from '@/stores/auth-store'

const USER_STATUS_VALUES = new Set(['-1', '1', '2'] as const)
const USER_ROLE_VALUES = new Set(['1', '10', '100'] as const)

export const Route = createFileRoute('/_authenticated/users/')({
  beforeLoad: () => {
    const { auth } = useAuthStore.getState()

    if (!auth.user || auth.user.role < ROLE.ADMIN) {
      throw redirect({
        to: '/403',
      })
    }
  },
  validateSearch: (
    search
  ): {
    page?: number
    pageSize?: number
    filter?: string
    status?: ('-1' | '1' | '2')[]
    role?: ('1' | '10' | '100')[]
    group?: string[]
  } => ({
    page: searchNumber(search.page, 1),
    pageSize: optionalSearchNumber(search.pageSize),
    filter: searchString(search.filter),
    status: searchStringArray(search.status, USER_STATUS_VALUES),
    role: searchStringArray(search.role, USER_ROLE_VALUES),
    group: searchStringArray(search.group),
  }),
  component: Users,
})
