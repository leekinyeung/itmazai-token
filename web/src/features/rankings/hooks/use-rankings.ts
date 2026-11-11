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
import { useQuery } from '@tanstack/react-query'

import { usePerformanceViewer } from '@/features/performance-metrics/hooks'
import { requireServerSuccess } from '@/lib/server-error-message'

import { getRankings } from '../api'
import type { RankingPeriod } from '../types'

export function useRankings(period: RankingPeriod) {
  const viewer = usePerformanceViewer()
  return useQuery({
    queryKey: ['rankings', viewer, period],
    queryFn: async ({ signal }) =>
      requireServerSuccess(await getRankings(period, signal)),
    staleTime: 5 * 60 * 1000,
    gcTime: 0,
  })
}
