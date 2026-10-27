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
import userEvent from '@testing-library/user-event'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

import { UptimePanel } from '../uptime-panel'

let client: QueryClient
const animationsDescriptor = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'getAnimations'
)
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'getAnimations', {
    configurable: true,
    value: () => [],
  })
})
afterAll(() => {
  if (animationsDescriptor) {
    Object.defineProperty(
      HTMLElement.prototype,
      'getAnimations',
      animationsDescriptor
    )
  } else {
    Reflect.deleteProperty(HTMLElement.prototype, 'getAnimations')
  }
})
beforeEach(() => {
  useAuthStore.getState().auth.reset()
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})
afterEach(() => {
  client.clear()
  useAuthStore.getState().auth.reset()
  vi.restoreAllMocks()
})

function renderUptime() {
  return render(
    <QueryClientProvider client={client}>
      <UptimePanel />
    </QueryClientProvider>
  )
}

describe('uptime viewer isolation', () => {
  it('replaces real administrator status after switching to a normal account', async () => {
    useAuthStore.getState().auth.setUser({ id: 1, username: 'admin', role: 10 })
    const request = vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            categoryName: 'Availability',
            monitors: [{ name: 'Real monitor', status: 0, uptime: 0.25 }],
          },
        ],
      },
    })
    renderUptime()
    await screen.findByText('25.00%')
    request.mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            categoryName: 'Availability',
            monitors: [{ name: 'Public monitor', status: 1, uptime: 1 }],
          },
        ],
      },
    })
    act(() =>
      useAuthStore.getState().auth.setUser({ id: 2, username: 'user', role: 1 })
    )
    expect(screen.queryByText('25.00%')).not.toBeInTheDocument()
    expect(screen.queryByText('Real monitor')).not.toBeInTheDocument()
    await screen.findByText('100.00%')
    expect(screen.getByText('Public monitor')).toBeVisible()
    expect(request).toHaveBeenLastCalledWith('/api/uptime/status', {
      signal: expect.any(AbortSignal),
      disableDuplicate: true,
    })
  })

  it('disables refresh while fetching and displays refreshed status', async () => {
    let finish: () => void = () => {
      throw new Error('Refresh has not started')
    }
    const request = vi
      .spyOn(api, 'get')
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: [
            {
              categoryName: 'Availability',
              monitors: [{ name: 'API monitor', status: 1, uptime: 1 }],
            },
          ],
        },
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = () =>
              resolve({
                data: {
                  success: true,
                  data: [
                    {
                      categoryName: 'Availability',
                      monitors: [
                        { name: 'API monitor', status: 0, uptime: 0.5 },
                      ],
                    },
                  ],
                },
              })
          })
      )
    renderUptime()
    await screen.findByText('100.00%')
    const refresh = screen.getByRole('button', { name: 'Refresh' })
    await userEvent.setup().click(refresh)
    await waitFor(() => expect(refresh).toBeDisabled())
    await act(async () => {
      finish()
    })
    await screen.findByText('50.00%')
    expect(refresh).toBeEnabled()
    expect(request).toHaveBeenCalledTimes(2)
  })

  it.each(['empty', 'failure'] as const)(
    'shows the existing empty state on %s',
    async (scenario) => {
      const request = vi.spyOn(api, 'get')
      if (scenario === 'empty') {
        request.mockResolvedValue({ data: { success: true, data: [] } })
      } else {
        request.mockRejectedValue(new Error('monitor unavailable'))
      }
      renderUptime()
      await screen.findByText('No uptime monitoring configured')
      expect(screen.queryByText('100.00%')).not.toBeInTheDocument()
    }
  )
})
