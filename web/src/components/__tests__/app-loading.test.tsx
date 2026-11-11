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
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { ThemeProvider } from '@/context/theme-provider'
import { Home } from '@/features/home'
import { Pricing } from '@/features/pricing'
import { parsePricingSearch } from '@/features/pricing/route-search'
import { i18nReady } from '@/i18n/config'
import { api } from '@/lib/api'
import { THEME_STORAGE_KEYS } from '@/lib/theme-storage'
import { useAuthStore } from '@/stores/auth-store'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { AppLoadingBoundary, RouteLoading } from '../app-loading'

let client: QueryClient

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>((complete) => {
    resolve = complete
  })
  return { promise, resolve }
}

const emptyPricing = {
  success: true,
  data: [],
  vendors: [],
  group_ratio: { default: 1 },
  usable_group: {},
  supported_endpoint: {},
  auto_groups: [],
}

beforeEach(async () => {
  await i18nReady
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  window.localStorage.clear()
  document.body.removeAttribute('data-theme-preset')
  document.body.removeAttribute('data-theme-radius')
  useAuthStore.getState().auth.setUser(null)
  useSystemConfigStore.getState().setLoading(false)
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  client.setQueryData(['status'], {})
  client.setQueryData(['notice'], { success: true, data: '' })
  client.setQueryData(['pricing'], emptyPricing)
})

test('the startup skeleton applies the saved theme and radius before routes mount', async () => {
  window.localStorage.setItem(THEME_STORAGE_KEYS.preset, 'rose-garden')
  window.localStorage.setItem(THEME_STORAGE_KEYS.radius, 'sm')
  const language = deferred<void>()
  await act(async () => {
    render(
      <AppLoadingBoundary
        ready={language.promise}
        location={{ pathname: '/', search: '' }}
      >
        <p>Ready page</p>
      </AppLoadingBoundary>
    )
  })

  expect(screen.getByRole('status', { name: 'Loading...' })).toBeVisible()
  expect(document.body).toHaveAttribute('data-theme-preset', 'rose-garden')
  expect(document.body).toHaveAttribute('data-theme-radius', 'sm')
})

test.each(['card', 'table'])(
  'a cold %s model page keeps its content geometry through language, route and data loading',
  async (view) => {
    const language = deferred<void>()
    const guard = deferred<void>()
    const response = deferred<{ data: typeof emptyPricing }>()
    client.removeQueries({ queryKey: ['pricing'] })
    vi.spyOn(api, 'get').mockImplementation(() => response.promise)

    const root = createRootRoute({ component: Outlet })
    const models = createRoute({
      getParentRoute: () => root,
      path: '/models/',
      validateSearch: parsePricingSearch,
      beforeLoad: () => guard.promise,
      component: Pricing,
    })
    const router = createRouter({
      routeTree: root.addChildren([models]),
      history: createMemoryHistory({
        initialEntries: [`/models?view=${view}`],
      }),
      defaultPendingComponent: RouteLoading,
      defaultPendingMinMs: 0,
    })
    await act(async () => {
      render(
        <QueryClientProvider client={client}>
          <ThemeProvider defaultTheme='dark' storageKey='test-loading-theme'>
            <AppLoadingBoundary
              ready={language.promise}
              location={{ pathname: '/models', search: `?view=${view}` }}
            >
              <RouterProvider router={router} />
            </AppLoadingBoundary>
          </ThemeProvider>
        </QueryClientProvider>
      )
    })

    const bootSkeleton = screen.getByRole('status', { name: 'Loading...' })
    expect(bootSkeleton.parentElement).toHaveClass(
      'max-w-[1800px]',
      'pt-20',
      'sm:pt-24'
    )
    const cardCount = view === 'card' ? 6 : 0
    expect(bootSkeleton.querySelectorAll('[data-slot="card"]')).toHaveLength(
      cardCount
    )
    expect(document.documentElement).toHaveClass('dark')

    await act(async () => language.resolve())
    await waitFor(() =>
      expect(
        router.state.matches.some((match) => match.status === 'pending')
      ).toBe(true)
    )
    const routeSkeleton = await screen.findByRole('status', {
      name: 'Loading...',
    })
    expect(routeSkeleton.parentElement).toHaveClass(
      'max-w-[1800px]',
      'pt-20',
      'sm:pt-24'
    )
    expect(routeSkeleton.querySelectorAll('[data-slot="card"]')).toHaveLength(
      cardCount
    )
    expect(
      screen.queryByRole('heading', { name: 'AI Models & API Pricing' })
    ).not.toBeInTheDocument()

    await act(async () => guard.resolve())
    await waitFor(() =>
      expect(router.state.matches.at(-1)?.status).toBe('success')
    )
    const header = await screen.findByRole('banner')
    const dataSkeleton = screen.getByRole('status', { name: 'Loading...' })
    const contentFrame = dataSkeleton.parentElement
    if (!contentFrame) throw new Error('The loading content frame is missing')
    expect(contentFrame).toHaveClass('max-w-[1800px]', 'pt-20', 'sm:pt-24')
    expect(dataSkeleton.querySelectorAll('[data-slot="card"]')).toHaveLength(
      cardCount
    )

    await act(async () => response.resolve({ data: emptyPricing }))
    expect(
      await screen.findByRole('heading', { name: 'No models found' })
    ).toBeVisible()
    expect(screen.getByRole('banner')).toBe(header)
    expect(
      within(contentFrame).getByRole('heading', {
        name: 'AI Models & API Pricing',
      })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('status', { name: 'Loading...' })
    ).not.toBeInTheDocument()
  }
)

test('a failed homepage request replaces its skeleton with a retry action', async () => {
  vi.spyOn(api, 'get').mockRejectedValue(new Error('offline'))
  const root = createRootRoute({ component: Home })
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  )

  expect(await screen.findByRole('button', { name: 'Retry' })).toBeVisible()
  expect(
    screen.queryByRole('status', { name: 'Loading...' })
  ).not.toBeInTheDocument()
})

test('a cached homepage stays visible while its content is refreshed in the background', async () => {
  window.localStorage.setItem(
    'newapi:home-page:v1',
    JSON.stringify({ content: '' })
  )
  vi.spyOn(api, 'get').mockImplementation(() => new Promise(() => {}))
  const root = createRootRoute({ component: Home })
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  )

  expect(await screen.findByRole('heading', { level: 1 })).toBeVisible()
  await waitFor(() =>
    expect(client.isFetching({ queryKey: ['homePageContent'] })).toBe(1)
  )
  expect(
    screen.queryByRole('status', { name: 'Loading...' })
  ).not.toBeInTheDocument()
})

afterEach(() => {
  cleanup()
  client.clear()
  window.localStorage.clear()
})

test('a cold homepage shows a page-shaped skeleton and keeps its header when content arrives', async () => {
  const response = deferred<{
    data: { success: boolean; data: string }
  }>()
  vi.spyOn(api, 'get').mockImplementation(() => response.promise)
  const root = createRootRoute({ component: Outlet })
  const home = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: Home,
  })
  const router = createRouter({
    routeTree: root.addChildren([home]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  )

  const header = await screen.findByRole('banner')
  const loading = screen.getByRole('status', { name: 'Loading...' })
  expect(loading).toHaveAttribute('aria-busy', 'true')
  expect(loading).toHaveClass('min-h-[calc(100svh-4rem)]')
  expect(loading.querySelector('[data-slot="skeleton"]')).toBeInTheDocument()
  const actions = loading.querySelectorAll(
    '.home-actions [data-slot="skeleton"]'
  )
  expect(actions).toHaveLength(2)
  for (const action of actions) {
    expect(action).toHaveClass('h-12', 'w-full', 'sm:w-40')
  }

  await act(async () => response.resolve({ data: { success: true, data: '' } }))

  expect(await screen.findByRole('heading', { level: 1 })).toBeVisible()
  expect(screen.getByRole('banner')).toBe(header)
  expect(
    screen.queryByRole('status', { name: 'Loading...' })
  ).not.toBeInTheDocument()
})
