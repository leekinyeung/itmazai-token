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
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { requireServerSuccess } from '@/lib/server-error-message'
import { useAuthStore } from '@/stores/auth-store'

import { getPerfMetrics, getPerfMetricsSummary } from './api'

export function performanceViewer(state = useAuthStore.getState()): string {
  const auth = state.auth
  return JSON.stringify([
    auth.user?.id ?? 0,
    auth.user?.role ?? 0,
    auth.user?.group ?? '',
    auth.session?.sid ?? '',
  ])
}

export const performanceQueryKeys = {
  detail: (viewer: string, model: string, hours = 24) =>
    ['perf-metrics', viewer, model, hours] as const,
  summary: (viewer: string, hours = 24, recentModels?: string[]) =>
    ['perf-metrics-summary', viewer, hours, recentModels ?? []] as const,
  uptime: (viewer: string) => ['uptime-status', viewer] as const,
}

export function usePerformanceViewer(): string {
  const viewer = useAuthStore(performanceViewer)
  const client = useQueryClient()
  useEffect(
    () =>
      useAuthStore.subscribe((state, previous) => {
        const oldViewer = performanceViewer(previous)
        if (performanceViewer(state) === oldViewer) return
        const filters = {
          predicate: (query: { queryKey: readonly unknown[] }) =>
            ['perf-metrics', 'perf-metrics-summary', 'uptime-status'].includes(
              String(query.queryKey[0])
            ) && query.queryKey[1] === oldViewer,
        }
        void client.cancelQueries(filters)
        client.removeQueries(filters)
      }),
    [client]
  )
  return viewer
}

export function usePerformanceMetrics(model: string, hours = 24) {
  const viewer = usePerformanceViewer()
  return useQuery({
    queryKey: performanceQueryKeys.detail(viewer, model, hours),
    queryFn: async ({ signal }) =>
      requireServerSuccess(await getPerfMetrics(model, hours, signal)),
    staleTime: 60 * 1000,
    gcTime: 0,
  })
}

export function usePerformanceSummary(hours = 24, recentModels?: string[]) {
  const viewer = usePerformanceViewer()
  return useQuery({
    queryKey: performanceQueryKeys.summary(viewer, hours, recentModels),
    queryFn: async ({ signal }) =>
      requireServerSuccess(
        await getPerfMetricsSummary(hours, recentModels, signal)
      ),
    enabled: recentModels === undefined || recentModels.length > 0,
    staleTime: 60 * 1000,
    gcTime: 0,
    retry: false,
  })
}
