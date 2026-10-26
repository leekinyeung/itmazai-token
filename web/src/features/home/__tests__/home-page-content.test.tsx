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
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { AxiosError, type AxiosAdapter, type AxiosResponse } from 'axios'
import type { PropsWithChildren } from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'
import { createAppQueryClient } from '@/lib/query-client'

import { useHomePageContent } from '../hooks/use-home-page-content'

const originalAdapter = api.defaults.adapter
const cacheKey = 'newapi:home-page:v1'

beforeEach(() => window.localStorage.clear())
afterEach(() => {
  api.defaults.adapter = originalAdapter
  window.localStorage.clear()
})

function createHomeFixture(adapter: AxiosAdapter) {
  api.defaults.adapter = adapter
  const onInternalServerError = vi.fn()
  const client = createAppQueryClient(onInternalServerError)
  function Wrapper(props: PropsWithChildren) {
    return (
      <QueryClientProvider client={client}>
        {props.children}
      </QueryClientProvider>
    )
  }
  return { wrapper: Wrapper, client, onInternalServerError }
}

test.each([
  '',
  '# Cached home',
  '<h1>Cached home</h1>',
  'https://example.com/home',
])(
  'cached content %j is ready while the refresh is pending',
  async (content) => {
    window.localStorage.setItem(cacheKey, JSON.stringify({ content }))
    let complete!: (response: AxiosResponse) => void
    const response = new Promise<AxiosResponse>((resolve) => {
      complete = resolve
    })
    const fixture = createHomeFixture(() => response)
    const hook = renderHook(useHomePageContent, fixture)

    expect(hook.result.current.status).toBe(content ? 'custom' : 'default')
    expect(hook.result.current.content).toBe(content)
    expect(hook.result.current.isUrl).toBe(content.startsWith('https:'))

    await act(async () =>
      complete({
        data: { success: true, data: 'Fresh home' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} },
      } as AxiosResponse)
    )
    await waitFor(() => expect(hook.result.current.content).toBe('Fresh home'))
    expect(JSON.parse(window.localStorage.getItem(cacheKey) ?? 'null')).toEqual(
      {
        content: 'Fresh home',
      }
    )
    fixture.client.clear()
  }
)

test('legacy custom content is shown before its refresh completes', () => {
  window.localStorage.setItem('home_page_content', '# Legacy home')
  const fixture = createHomeFixture(() => new Promise(() => {}))
  const hook = renderHook(useHomePageContent, fixture)
  expect(hook.result.current.status).toBe('custom')
  expect(hook.result.current.content).toBe('# Legacy home')
  hook.unmount()
  fixture.client.clear()
})

test.each([null, '{broken', '{"content":false}'])(
  'absent or invalid cache %j stays unknown until configuration is fetched',
  (cached) => {
    if (cached !== null) window.localStorage.setItem(cacheKey, cached)
    const fixture = createHomeFixture(() => new Promise(() => {}))
    const hook = renderHook(useHomePageContent, fixture)
    expect(hook.result.current.status).toBe('unknown')
    hook.unmount()
    fixture.client.clear()
  }
)

test('a successful empty response persists a confirmed default home for the next visit', async () => {
  const fixture = createHomeFixture(async (config) => ({
    data: { success: true, data: '' },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  }))
  const hook = renderHook(useHomePageContent, fixture)
  await waitFor(() => expect(hook.result.current.status).toBe('default'))
  expect(JSON.parse(window.localStorage.getItem(cacheKey) ?? 'null')).toEqual({
    content: '',
  })
  fixture.client.clear()
})

test('concurrent consumers share one content request', async () => {
  const adapter = vi.fn<AxiosAdapter>(async (config) => ({
    data: { success: true, data: '# Shared' },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  }))
  const fixture = createHomeFixture(adapter)
  const hook = renderHook(
    () => ({ first: useHomePageContent(), second: useHomePageContent() }),
    fixture
  )
  await waitFor(() =>
    expect(hook.result.current.second.content).toBe('# Shared')
  )
  expect(hook.result.current.first.content).toBe('# Shared')
  expect(adapter).toHaveBeenCalledTimes(1)
  fixture.client.clear()
})

test.each([42, null, undefined])(
  'an invalid response payload %j is an error rather than confirmation of the default home',
  async (data) => {
    const fixture = createHomeFixture(async (config) => ({
      data: { success: true, data },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }))
    const hook = renderHook(useHomePageContent, fixture)
    await waitFor(() => expect(hook.result.current.status).toBe('error'))
    expect(window.localStorage.getItem(cacheKey)).toBeNull()
    fixture.client.clear()
  }
)

test('business failure becomes an error and a manual retry can recover', async () => {
  let failed = true
  const adapter = vi.fn<AxiosAdapter>(async (config) => ({
    data: failed
      ? { success: false, message: 'Unavailable' }
      : { success: true, data: '# Recovered' },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  }))
  const fixture = createHomeFixture(adapter)
  const hook = renderHook(useHomePageContent, fixture)
  await waitFor(() => expect(hook.result.current.status).toBe('error'))
  expect(adapter).toHaveBeenCalledTimes(1)
  expect(window.localStorage.getItem(cacheKey)).toBeNull()
  failed = false
  await act(async () => {
    await hook.result.current.retry()
  })
  await waitFor(() => expect(hook.result.current.content).toBe('# Recovered'))
  fixture.client.clear()
})

test.each([false, true])(
  'HTTP failure keeps cached content when present (%j) without a global redirect',
  async (cached) => {
    if (cached) {
      window.localStorage.setItem(
        cacheKey,
        JSON.stringify({ content: '# Still available' })
      )
    }
    const fixture = createHomeFixture(async (config) => {
      throw new AxiosError(
        'Unavailable',
        AxiosError.ERR_BAD_RESPONSE,
        config,
        undefined,
        {
          status: 500,
          data: { message: 'Unavailable' },
          headers: {},
          statusText: 'Unavailable',
          config,
        }
      )
    })
    const hook = renderHook(useHomePageContent, fixture)
    await waitFor(() => expect(hook.result.current.error).toBeTruthy())
    expect(hook.result.current.status).toBe(cached ? 'custom' : 'error')
    expect(hook.result.current.isRefreshing).toBe(false)
    expect(fixture.onInternalServerError).not.toHaveBeenCalled()
    fixture.client.clear()
  }
)

test('a timeout ends the unknown state and uses the bounded request timeout', async () => {
  const fixture = createHomeFixture(async (config) => {
    expect(config.timeout).toBe(10_000)
    throw new AxiosError('timeout', AxiosError.ECONNABORTED, config)
  })
  const hook = renderHook(useHomePageContent, fixture)
  await waitFor(() => expect(hook.result.current.status).toBe('error'))
  expect(hook.result.current.isRefreshing).toBe(false)
  fixture.client.clear()
})

test('storage read and write failures do not prevent a successful home response', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('Storage unavailable')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Storage unavailable')
  })
  const fixture = createHomeFixture(async (config) => ({
    data: { success: true, data: '# Available' },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  }))
  const hook = renderHook(useHomePageContent, fixture)
  await waitFor(() => expect(hook.result.current.content).toBe('# Available'))
  fixture.client.clear()
})
