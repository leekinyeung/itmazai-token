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
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { useAuthStore, type AuthBundle } from '@/stores/auth-store'

import { useAuthRedirect } from '../use-auth-redirect'

vi.mock('@/i18n/locales/fr.json', () => {
  throw new Error('Language download failed')
})

afterEach(() => {
  useAuthStore.getState().auth.reset('idle')
  vi.doUnmock('@/i18n/locales/ja.json')
})

function createLoginFixture(language: string) {
  const bundle: AuthBundle = {
    access_token: 'test-access-token',
    token_type: 'Bearer',
    access_expires_at: Math.floor(Date.now() / 1000) + 600,
    user: { id: 42, username: 'test-user', role: 1, language },
    session: {
      sid: 'language-test',
      current: true,
      login_method: 'password',
      ip: '127.0.0.1',
      user_agent: 'test',
      created_at: 100,
      last_active_at: 100,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    },
  }
  const completion: { result?: Promise<boolean> } = {}
  function Login() {
    const redirect = useAuthRedirect()
    return (
      <button
        type='button'
        onClick={() => {
          completion.result = redirect.handleLoginResult(bundle)
        }}
      >
        Complete login
      </button>
    )
  }
  const root = createRootRoute({ component: Outlet })
  const login = createRoute({
    getParentRoute: () => root,
    path: '/sign-in',
    component: Login,
  })
  const dashboard = createRoute({
    getParentRoute: () => root,
    path: '/dashboard',
    component: () => <p>Signed in</p>,
  })
  const router = createRouter({
    routeTree: root.addChildren([login, dashboard]),
    history: createMemoryHistory({ initialEntries: ['/sign-in'] }),
  })
  return { router, completion }
}

test('a valid login still navigates when the saved language cannot be downloaded', async () => {
  const { router } = createLoginFixture('fr')
  render(<RouterProvider router={router} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Complete login' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'))
  expect(useAuthStore.getState().auth.session?.sid).toBe('language-test')
  expect(useAuthStore.getState().auth.accessToken).toBe('test-access-token')
})

test('ending the session during language loading prevents the stale login redirect', async () => {
  let started!: () => void
  let complete!: (resource: {
    default: { translation: Record<string, string> }
  }) => void
  const requested = new Promise<void>((resolve) => {
    started = resolve
  })
  vi.doMock(
    '@/i18n/locales/ja.json',
    () =>
      new Promise((resolve) => {
        complete = resolve
        started()
      })
  )
  const fixture = createLoginFixture('ja')
  render(<RouterProvider router={fixture.router} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Complete login' }))
  await requested
  await act(async () => {
    useAuthStore.getState().auth.reset('idle')
    complete({ default: { translation: { 'Loading...': '読み込み中...' } } })
    await fixture.completion.result
  })
  expect(fixture.router.state.location.pathname).toBe('/sign-in')
  expect(useAuthStore.getState().auth.session).toBeNull()
})
