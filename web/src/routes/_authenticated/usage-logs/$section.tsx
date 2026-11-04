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

import { UsageLogs } from '@/features/usage-logs'
import {
  isUsageLogsSectionId,
  USAGE_LOGS_DEFAULT_SECTION,
} from '@/features/usage-logs/route-constants'
import {
  optionalSearchNumber,
  searchNumber,
  searchString,
  searchStringArray,
} from '@/lib/route-search'

const logTypeValues = ['0', '1', '2', '3', '4', '5', '6', '7'] as const
const LOG_TYPE_VALUES = new Set(logTypeValues)

type UsageLogsRouteSearch = {
  page?: number
  pageSize?: number
  type?: string[]
  filter?: string
  model?: string
  token?: string
  channel?: string
  group?: string
  username?: string
  requestId?: string
  upstreamRequestId?: string
  startTime?: number
  endTime?: number
}

function parseUsageLogsSearch(
  search: Record<string, unknown>
): UsageLogsRouteSearch {
  let parsedType: string[] | undefined
  if (Array.isArray(search.type)) {
    parsedType = searchStringArray(search.type, LOG_TYPE_VALUES)
  } else if (search.type != null && search.type !== '') {
    parsedType = searchStringArray([search.type], LOG_TYPE_VALUES)
  }
  return {
    page: searchNumber(search.page, 1),
    pageSize: optionalSearchNumber(search.pageSize),
    type: parsedType,
    filter: searchString(search.filter),
    model: searchString(search.model),
    token: searchString(search.token),
    channel: searchString(search.channel),
    group: searchString(search.group),
    username: searchString(search.username),
    requestId: searchString(search.requestId),
    upstreamRequestId: searchString(search.upstreamRequestId),
    startTime: optionalSearchNumber(search.startTime),
    endTime: optionalSearchNumber(search.endTime),
  }
}

export const Route = createFileRoute('/_authenticated/usage-logs/$section')({
  validateSearch: parseUsageLogsSearch,
  beforeLoad: ({ params, search }) => {
    if (!isUsageLogsSectionId(params.section)) {
      throw redirect({
        to: '/usage-logs/$section',
        params: { section: USAGE_LOGS_DEFAULT_SECTION },
      })
    }
    // type 仅 common 使用，非 common 时清掉 URL 里的 type
    const hasTypeSearch = Array.isArray(search?.type)
      ? search.type.length > 0
      : search?.type != null && search.type !== ''
    if (params.section !== 'common' && hasTypeSearch) {
      throw redirect({
        to: '/usage-logs/$section',
        params: { section: params.section },
        search: { ...search, type: undefined },
        replace: true,
      })
    }
  },
  component: UsageLogs,
})
