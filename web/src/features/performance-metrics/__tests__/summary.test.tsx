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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PerformanceOverview } from '@/features/dashboard/components/models/performance-overview'
import { PerformanceHealthPanel } from '@/features/dashboard/components/overview/performance-health-panel'
import { ModelDetailsPerformance } from '@/features/pricing/components/model-details-performance'
import { UptimeSparkline } from '@/features/pricing/components/model-details-uptime-sparkline'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

import { performanceQueryKeys, performanceViewer } from '../hooks'

const chart = vi.hoisted(() =>
  vi.fn(
    (_props: {
      spec: { data: { id: string; values: Record<string, unknown>[] }[] }
    }) => null
  )
)
vi.mock('@visactor/react-vchart', () => ({ VChart: chart }))
vi.mock('@visactor/vchart', () => ({
  ThemeManager: { setCurrentTheme: vi.fn() },
}))

let client: QueryClient
beforeEach(() => {
  chart.mockClear()
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
})
afterEach(() => {
  client.clear()
  useAuthStore.getState().auth.reset()
  vi.restoreAllMocks()
})

const summary = { success_rate: 99.01, avg_latency_ms: 1009, avg_tps: 5 }
const windowStart = 1789387200
const windowEnd = windowStart + 23 * 3600 + 1800
const groups = [
  {
    group: 'a',
    success_rate: 100,
    avg_latency_ms: 1000,
    avg_ttft_ms: 100,
    avg_tps: 5,
    series: [
      {
        ts: windowStart,
        avg_ttft_ms: 100,
        avg_latency_ms: 1000,
        success_rate: 100,
        avg_tps: 5,
      },
    ],
  },
  {
    group: 'b',
    success_rate: 0,
    avg_latency_ms: 2000,
    avg_ttft_ms: 0,
    avg_tps: 0,
    series: [
      {
        ts: windowStart,
        avg_ttft_ms: 0,
        avg_latency_ms: 2000,
        success_rate: 0,
        avg_tps: 0,
      },
    ],
  },
]

function renderModelDetails() {
  client.setQueryData(
    performanceQueryKeys.detail(performanceViewer(), 'test-model'),
    {
      success: true,
      data: {
        model_name: 'test-model',
        summary,
        series: [
          {
            ts: windowStart,
            avg_ttft_ms: 100,
            avg_latency_ms: 1009,
            success_rate: 99.01,
            avg_tps: 5,
          },
        ],
        window_start: windowStart,
        window_end: windowEnd,
        groups,
      },
    }
  )
  return render(
    <QueryClientProvider client={client}>
      <ModelDetailsPerformance
        model={{
          id: 1,
          model_name: 'test-model',
          quota_type: 0,
          model_ratio: 1,
          completion_ratio: 1,
          enable_groups: ['a', 'b'],
        }}
      />
    </QueryClientProvider>
  )
}

describe('server performance summaries', () => {
  it('replaces administrator metrics when the viewer changes to an ordinary account', async () => {
    useAuthStore.getState().auth.setUser({ id: 1, username: 'admin', role: 10 })
    const request = vi.spyOn(api, 'get').mockResolvedValue({
      data: { success: true, data: { summary, models: [] } },
    })
    render(
      <QueryClientProvider client={client}>
        <PerformanceHealthPanel />
      </QueryClientProvider>
    )
    await screen.findByText('99.01%')
    request.mockResolvedValue({
      data: {
        success: true,
        data: { summary: { ...summary, success_rate: 100 }, models: [] },
      },
    })
    act(() =>
      useAuthStore.getState().auth.setUser({ id: 2, username: 'user', role: 1 })
    )
    expect(screen.queryByText('99.01%')).not.toBeInTheDocument()
    await screen.findByText('100.00%')
  })

  it.each(['logout', 'role', 'group', 'session'] as const)(
    'discards cached metrics after a %s change',
    async (change) => {
      useAuthStore
        .getState()
        .auth.setUser({ id: 1, username: 'admin', role: 10, group: 'default' })
      const oldKey = performanceQueryKeys.summary(performanceViewer())
      const request = vi.spyOn(api, 'get').mockResolvedValue({
        data: { success: true, data: { summary, models: [] } },
      })
      render(
        <QueryClientProvider client={client}>
          <PerformanceHealthPanel />
        </QueryClientProvider>
      )
      await screen.findByText('99.01%')
      request.mockResolvedValue({
        data: {
          success: true,
          data: { summary: { ...summary, success_rate: 100 }, models: [] },
        },
      })
      act(() => {
        if (change === 'logout') {
          useAuthStore.getState().auth.reset()
        } else if (change === 'session') {
          useAuthStore.setState((state) => ({
            auth: {
              ...state.auth,
              session: {
                sid: 'new-session',
                current: true,
                login_method: 'password',
                ip: '',
                user_agent: '',
                created_at: 1,
                last_active_at: 1,
                expires_at: 2,
              },
            },
          }))
        } else {
          useAuthStore.getState().auth.setUser({
            id: 1,
            username: 'admin',
            role: change === 'role' ? 1 : 10,
            group: change === 'group' ? 'premium' : 'default',
          })
        }
      })
      expect(screen.queryByText('99.01%')).not.toBeInTheDocument()
      expect(client.getQueryData(oldKey)).toBeUndefined()
      await screen.findByText('100.00%')
    }
  )

  it('cancels the old identity request and ignores its late administrator response', async () => {
    useAuthStore.getState().auth.setUser({ id: 1, username: 'admin', role: 10 })
    let finishOld: () => void = () => {
      throw new Error('Request has not started')
    }
    const request = vi
      .spyOn(api, 'get')
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishOld = () =>
              resolve({
                data: { success: true, data: { summary, models: [] } },
              })
          })
      )
      .mockResolvedValue({
        data: {
          success: true,
          data: { summary: { ...summary, success_rate: 100 }, models: [] },
        },
      })
    render(
      <QueryClientProvider client={client}>
        <PerformanceHealthPanel />
      </QueryClientProvider>
    )
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1))
    const oldSignal = request.mock.calls[0][1]?.signal
    act(() => useAuthStore.getState().auth.reset())
    expect(oldSignal?.aborted).toBe(true)
    await screen.findByText('100.00%')
    await act(async () => {
      finishOld()
    })
    expect(screen.queryByText('99.01%')).not.toBeInTheDocument()
    expect(screen.getByText('100.00%')).toBeVisible()
  })
  it.each([PerformanceHealthPanel, PerformanceOverview])(
    'uses the weighted server result across models',
    (Component) => {
      client.setQueryData(performanceQueryKeys.summary(performanceViewer()), {
        success: true,
        data: {
          summary,
          models: groups.map((group) => ({
            ...group,
            model_name: group.group,
          })),
        },
      })
      render(
        <QueryClientProvider client={client}>
          <Component />
        </QueryClientProvider>
      )
      expect(screen.getByText('99.01%')).toBeVisible()
      expect(screen.queryByText('50.00%')).not.toBeInTheDocument()
      expect(screen.getByText('1.01s')).toBeVisible()
    }
  )

  it('shows the server summary and series incident count for model details instead of averaging groups', () => {
    renderModelDetails()
    expect(screen.getByText('99.01%')).toBeVisible()
    expect(screen.queryByText('50.00%')).not.toBeInTheDocument()
    expect(screen.getByText('1 incidents in the last 24 hours')).toBeVisible()
  })

  it('feeds the uptime chart from the backend series rather than group averages', async () => {
    renderModelDetails()
    await waitFor(() => expect(chart).toHaveBeenCalled())
    const specs = chart.mock.calls.map(([props]) => props.spec)
    const uptime = specs.find((value) => value.data[0].id === 'uptime')
    const uptimeValues = uptime?.data[0].values.map((value) => value.uptime)
    expect(uptimeValues).toContain(99.01)
    expect(uptimeValues).not.toContain(50)
  })

  it('shows each group success rate in its own sparkline label', () => {
    renderModelDetails()
    expect(screen.getByText('100.00%')).toBeVisible()
    expect(screen.getByText('0.00%')).toBeVisible()
  })

  it('displays the supplied group summary instead of averaging hourly percentages', () => {
    render(
      <UptimeSparkline
        overallSuccessRate={99.01}
        series={[
          {
            date: '2026-09-14T11:00:00Z',
            uptime_pct: 100,
            incidents: 0,
            outage_minutes: 0,
          },
          {
            date: '2026-09-14T12:00:00Z',
            uptime_pct: 0,
            incidents: 1,
            outage_minutes: 0,
          },
        ]}
      />
    )
    expect(screen.getByText('99.01%')).toBeVisible()
    expect(screen.queryByText('50.00%')).not.toBeInTheDocument()
  })

  it('keeps an empty summary unknown instead of inventing a zero success rate', () => {
    client.setQueryData(performanceQueryKeys.summary(performanceViewer()), {
      success: true,
      data: { models: [], summary: null },
    })
    render(
      <QueryClientProvider client={client}>
        <PerformanceHealthPanel />
      </QueryClientProvider>
    )
    expect(screen.getAllByText('—')).toHaveLength(3)
    expect(screen.queryByText('0.00%')).not.toBeInTheDocument()
  })
})
