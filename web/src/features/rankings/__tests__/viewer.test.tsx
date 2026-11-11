import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { performanceViewer } from '@/features/performance-metrics/hooks'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

import { useRankings } from '../hooks/use-rankings'
import type { RankingPeriod, RankingsSnapshot } from '../types'

const admin = { id: 1, username: 'admin', role: 10, group: 'default' }
const session = {
  sid: 'new-session',
  current: true,
  login_method: 'password',
  ip: '',
  user_agent: '',
  created_at: 1,
  last_active_at: 1,
  expires_at: 2,
}

function snapshot(tokens: number): RankingsSnapshot {
  return {
    models: [
      {
        rank: 1,
        model_name: 'listed-model',
        vendor: 'Listed vendor',
        category: 'all',
        total_tokens: tokens,
        share: 1,
        growth_pct: 5,
      },
    ],
    vendors: [],
    top_movers: [],
    top_droppers: [],
    models_history: { points: [], models: [], buckets: 0 },
    vendor_share_history: { points: [], vendors: [], buckets: 0 },
  }
}

let client: QueryClient

function Wrapper(props: { children: ReactNode }) {
  return (
    <QueryClientProvider client={client}>{props.children}</QueryClientProvider>
  )
}

beforeEach(() => {
  useAuthStore.getState().auth.reset()
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})

afterEach(() => {
  client.clear()
  useAuthStore.getState().auth.reset()
  vi.restoreAllMocks()
})

describe('rankings viewer isolation', () => {
  it.each(['login', 'logout', 'account', 'role', 'group', 'session'] as const)(
    'removes the old rankings immediately after a %s change',
    async (change) => {
      if (change !== 'login') useAuthStore.getState().auth.setUser(admin)
      const oldKey = ['rankings', performanceViewer(), 'week']
      const oldData = snapshot(change === 'login' ? 2_000_000_000 : 12345)
      const newData = snapshot(change === 'login' ? 12345 : 2_000_000_000)
      const request = vi
        .spyOn(api, 'get')
        .mockResolvedValueOnce({ data: { success: true, data: oldData } })
        .mockResolvedValue({ data: { success: true, data: newData } })
      const { result } = renderHook(() => useRankings('week'), {
        wrapper: Wrapper,
      })
      await waitFor(() => expect(result.current.data?.data).toEqual(oldData))

      act(() => {
        if (change === 'login') {
          useAuthStore.getState().auth.setUser(admin)
        } else if (change === 'logout') {
          useAuthStore.getState().auth.reset()
        } else if (change === 'session') {
          useAuthStore.setState((state) => ({
            auth: { ...state.auth, session },
          }))
        } else {
          useAuthStore.getState().auth.setUser({
            ...admin,
            id: change === 'account' ? 2 : 1,
            role: change === 'role' ? 1 : 10,
            group: change === 'group' ? 'premium' : 'default',
          })
        }
      })

      expect(result.current.data).toBeUndefined()
      expect(client.getQueryData(oldKey)).toBeUndefined()
      await waitFor(() => expect(result.current.data?.data).toEqual(newData))
      expect(request).toHaveBeenLastCalledWith(
        '/api/rankings',
        expect.objectContaining({
          params: { period: 'week' },
          disableDuplicate: true,
          signal: expect.any(AbortSignal),
        })
      )
    }
  )

  it('aborts the old request and ignores a late administrator response after logout', async () => {
    useAuthStore.getState().auth.setUser(admin)
    const oldKey = ['rankings', performanceViewer(), 'week']
    let finishOld: () => void = () => {
      throw new Error('Request has not started')
    }
    const publicData = snapshot(2_000_000_000)
    const request = vi
      .spyOn(api, 'get')
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishOld = () =>
              resolve({ data: { success: true, data: snapshot(12345) } })
          })
      )
      .mockResolvedValue({ data: { success: true, data: publicData } })
    const { result } = renderHook(() => useRankings('week'), {
      wrapper: Wrapper,
    })
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1))
    const oldSignal = request.mock.calls[0][1]?.signal

    act(() => useAuthStore.getState().auth.reset())
    expect(oldSignal?.aborted).toBe(true)
    await waitFor(() => expect(result.current.data?.data).toEqual(publicData))
    await act(async () => finishOld())

    expect(client.getQueryData(oldKey)).toBeUndefined()
    expect(result.current.data?.data).toEqual(publicData)
  })

  it('fetches the selected period without displaying the previous period', async () => {
    const week = snapshot(14_000_000_000)
    const today = snapshot(2_000_000_000)
    const request = vi
      .spyOn(api, 'get')
      .mockResolvedValueOnce({ data: { success: true, data: week } })
      .mockResolvedValue({ data: { success: true, data: today } })
    const { result, rerender } = renderHook(
      (props: { period: RankingPeriod }) => useRankings(props.period),
      { initialProps: { period: 'week' }, wrapper: Wrapper }
    )
    await waitFor(() => expect(result.current.data?.data).toEqual(week))
    rerender({ period: 'today' })
    expect(result.current.data).toBeUndefined()
    await waitFor(() => expect(result.current.data?.data).toEqual(today))
    expect(request).toHaveBeenLastCalledWith(
      '/api/rankings',
      expect.objectContaining({ params: { period: 'today' } })
    )
  })

  it('reports a server failure without reusing cached administrator data', async () => {
    useAuthStore.getState().auth.setUser(admin)
    const request = vi
      .spyOn(api, 'get')
      .mockResolvedValueOnce({ data: { success: true, data: snapshot(12345) } })
      .mockResolvedValue({
        data: { success: false, message: 'rankings unavailable' },
      })
    const { result } = renderHook(() => useRankings('week'), {
      wrapper: Wrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    act(() => useAuthStore.getState().auth.reset())
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.data).toBeUndefined()
    expect(result.current.error?.message).toBe('rankings unavailable')
    expect(request).toHaveBeenCalledTimes(2)
  })
})
