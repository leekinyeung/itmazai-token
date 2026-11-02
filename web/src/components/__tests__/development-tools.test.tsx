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
  Link,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'

import { DevelopmentTools } from '../development-tools'

// Vendor packages export no-op components in test mode. Represent their
// mounted, focusable overlay boundary while exercising real router navigation.
vi.mock('@tanstack/react-router-devtools', () => ({
  TanStackRouterDevtools: () => (
    <aside aria-label='Router development panel'>
      <button type='button'>Routes</button>
    </aside>
  ),
}))

vi.mock('@tanstack/react-query-devtools', () => ({
  ReactQueryDevtools: () => (
    <aside aria-label='Query development panel'>
      <button type='button'>Open Tanstack query devtools</button>
    </aside>
  ),
}))

const clients: QueryClient[] = []

afterEach(() => {
  cleanup()
  clients.splice(0).forEach((client) => client.clear())
  window.localStorage.clear()
})

test.each(['/sign-in', '/sign-up', '/forgot-password'])(
  'navigating to %s removes open development panels and leaves form controls focusable',
  async (path) => {
    const user = userEvent.setup()
    const client = new QueryClient()
    clients.push(client)
    const root = createRootRoute({
      component: () => (
        <>
          <Outlet />
          <DevelopmentTools />
        </>
      ),
    })
    const home = createRoute({
      getParentRoute: () => root,
      path: '/',
      component: () => <Link to={path}>Open authentication</Link>,
    })
    const auth = createRoute({ getParentRoute: () => root, id: '(auth)' })
    const form = createRoute({
      getParentRoute: () => auth,
      path,
      component: () => (
        <>
          <Link to='/'>Home</Link>
          <input aria-label='Account name' />
          <button type='button'>Continue</button>
        </>
      ),
    })
    const router = createRouter({
      routeTree: root.addChildren([home, auth.addChildren([form])]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    })
    await router.load()
    render(
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    )
    expect(await screen.findByRole('button', { name: 'Routes' })).toBeVisible()
    await user.click(screen.getByRole('link', { name: 'Open authentication' }))
    const input = await screen.findByRole('textbox', { name: 'Account name' })
    expect(
      screen.queryByRole('complementary', {
        name: 'Router development panel',
        hidden: true,
      })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Routes', hidden: true })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', {
        name: 'Open Tanstack query devtools',
        hidden: true,
      })
    ).not.toBeInTheDocument()
    await user.click(input)
    expect(input).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveFocus()
    await user.click(screen.getByRole('link', { name: 'Home' }))
    expect(await screen.findByRole('button', { name: 'Routes' })).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'Open Tanstack query devtools' })
    ).toBeVisible()
  }
)
