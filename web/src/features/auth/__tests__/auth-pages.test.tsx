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
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18next from 'i18next'
import { afterEach, expect, test, vi } from 'vitest'

import { ThemeProvider } from '@/context/theme-provider'
import { i18nReady } from '@/i18n/config'
import en from '@/i18n/locales/en.json'
import zh from '@/i18n/locales/zh.json'
import { api } from '@/lib/api'
import { STATUS_QUERY_KEY } from '@/lib/status-query'
import { useAuthStore } from '@/stores/auth-store'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { ForgotPassword } from '../forgot-password'
import { SignIn } from '../sign-in'
import { SignUp } from '../sign-up'

const clients: QueryClient[] = []
const originalConfig = useSystemConfigStore.getState().config

afterEach(async () => {
  cleanup()
  clients.splice(0).forEach((client) => client.clear())
  useAuthStore.getState().auth.reset('idle')
  useSystemConfigStore.getState().setConfig(originalConfig)
  window.localStorage.clear()
  await i18next.changeLanguage('en')
})

async function renderAuthPage(
  path: '/sign-in' | '/sign-up' | '/forgot-password',
  status: Record<string, unknown> = {}
) {
  await i18nReady
  i18next.addResourceBundle('en', 'translation', en.translation, true, true)
  useAuthStore.getState().auth.reset('idle')
  useSystemConfigStore.getState().setConfig({
    systemName: 'Local brand',
    logo: '/logo.png',
  })
  useSystemConfigStore.getState().setLoading(false)
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  clients.push(client)
  client.setQueryData(STATUS_QUERY_KEY, {
    password_login_enabled: true,
    password_login_encryption_enabled: false,
    register_enabled: true,
    turnstile_check: false,
    email_verification: false,
    ...status,
  })
  const root = createRootRoute({ component: Outlet })
  const auth = createRoute({
    getParentRoute: () => root,
    id: '(auth)',
    component: Outlet,
  })
  const signIn = createRoute({
    getParentRoute: () => auth,
    path: '/sign-in',
    component: SignIn,
  })
  const signUp = createRoute({
    getParentRoute: () => auth,
    path: '/sign-up',
    component: SignUp,
  })
  const forgotPassword = createRoute({
    getParentRoute: () => auth,
    path: '/forgot-password',
    component: ForgotPassword,
  })
  const home = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: () => <h1>Home</h1>,
  })
  const router = createRouter({
    routeTree: root.addChildren([
      auth.addChildren([signIn, signUp, forgotPassword]),
      home,
    ]),
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  await router.load()
  render(
    <QueryClientProvider client={client}>
      <ThemeProvider defaultTheme='light'>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  )
  return router
}

test('switching between the redesigned auth pages retains account navigation and configured branding', async () => {
  const user = userEvent.setup()
  const router = await renderAuthPage('/sign-in')
  expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
    'Welcome back'
  )
  expect(
    screen.getByRole('link', { name: 'Logo Local brand' })
  ).toHaveAttribute('href', '/')
  expect(screen.getByRole('button', { name: 'Back to Home' })).toHaveAttribute(
    'href',
    '/'
  )
  expect(screen.getByRole('button', { name: 'Change language' })).toBeEnabled()
  await user.click(screen.getByRole('link', { name: 'Sign up now' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/sign-up'))
  expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
    'Create an account'
  )
  expect(screen.getByRole('link', { name: 'Sign in now' })).toHaveAttribute(
    'href',
    '/sign-in'
  )
})

test('registration keeps password-manager support, paste, visibility toggles and mismatch validation', async () => {
  const post = vi.spyOn(api, 'post')
  const user = userEvent.setup()
  await renderAuthPage('/sign-up')
  const username = await screen.findByRole('textbox', { name: 'Username' })
  const password = screen.getByLabelText('Password', { exact: true })
  const confirmation = screen.getByLabelText('Confirm password', {
    exact: true,
  })
  expect(username).toHaveAttribute('autocomplete', 'username')
  expect(password).toHaveAttribute('autocomplete', 'new-password')
  expect(confirmation).toHaveAttribute('autocomplete', 'new-password')
  await user.type(username, 'new-user')
  await user.click(password)
  await user.paste('a-long-test-password')
  const toggle = screen.getAllByRole('button', {
    name: 'Toggle password visibility',
  })[0]
  await user.click(toggle)
  expect(toggle).toHaveAttribute('aria-pressed', 'true')
  expect(password).toHaveAttribute('type', 'text')
  expect(password).toHaveValue('a-long-test-password')
  await user.click(toggle)
  expect(password).toHaveAttribute('type', 'password')
  await user.type(confirmation, 'a-different-test-password')
  await user.click(screen.getByRole('button', { name: 'Create account' }))
  expect(await screen.findByText("Passwords don't match.")).toBeVisible()
  await waitFor(() => expect(confirmation).toHaveFocus())
  expect(post).not.toHaveBeenCalled()
})

test('registration preserves configured email verification and explicit legal consent', async () => {
  const user = userEvent.setup()
  await renderAuthPage('/sign-up', {
    email_verification: true,
    user_agreement_enabled: true,
    privacy_policy_enabled: true,
  })
  expect(
    await screen.findByLabelText('Email (required for verification)')
  ).toBeVisible()
  expect(screen.getByPlaceholderText('Verification code')).toBeVisible()
  expect(screen.getByRole('checkbox')).not.toBeChecked()
  const submit = screen.getByRole('button', { name: 'Create account' })
  expect(submit).toBeDisabled()
  await user.click(screen.getByRole('checkbox'))
  expect(submit).toBeEnabled()
  expect(
    screen.getAllByRole('link', { name: 'Privacy Policy' })[0]
  ).toHaveAttribute('href', '/privacy-policy')
})

test('disabled password login and registration remain unavailable in the new layout', async () => {
  await renderAuthPage('/sign-in', {
    password_login_enabled: false,
    register_enabled: false,
  })
  await screen.findByRole('heading', { level: 1 })
  expect(screen.queryByLabelText('Password', { exact: true })).toBeNull()
  expect(screen.queryByRole('button', { name: /^Sign in$/ })).toBeNull()
  expect(screen.queryByRole('link', { name: 'Sign up now' })).toBeNull()
})

test('changing the interface language updates the auth copy without clearing entered fields', async () => {
  const user = userEvent.setup()
  await renderAuthPage('/sign-in')
  const username = await screen.findByLabelText('Username or Email')
  await user.type(username, 'existing-user')
  i18next.addResourceBundle('zhCN', 'translation', zh.translation, true, true)
  await act(async () => {
    await i18next.changeLanguage('zhCN')
  })
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
    '欢迎回来'
  )
  expect(username).toHaveValue('existing-user')
  expect(screen.getByRole('button', { name: '更改语言' })).toHaveTextContent(
    '简体中文'
  )
})

test('forgot-password validates email before requesting a reset and provides a return to login', async () => {
  const get = vi.spyOn(api, 'get')
  const user = userEvent.setup()
  const router = await renderAuthPage('/forgot-password')
  expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
    'Forgot password'
  )
  const email = screen.getByRole('textbox', { name: /^Email$/ })
  expect(email).toHaveAttribute('type', 'email')
  expect(email).toHaveAttribute('autocomplete', 'email')
  await user.click(email)
  await user.paste('invalid-email')
  await user.click(screen.getByRole('button', { name: 'Send reset email' }))
  expect(
    await screen.findByText('Please enter a valid email address')
  ).toBeVisible()
  await waitFor(() => expect(email).toHaveFocus())
  expect(email).toHaveAttribute('aria-invalid', 'true')
  expect(get).not.toHaveBeenCalled()
  await user.click(screen.getByRole('link', { name: 'Back to login' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'))
})

test('successful reset requests clear the email and prevent resending during the countdown', async () => {
  const get = vi
    .spyOn(api, 'get')
    .mockResolvedValue({ data: { success: true } })
  const user = userEvent.setup()
  await renderAuthPage('/forgot-password')
  const email = await screen.findByRole('textbox', {
    name: /^Email$/,
  })
  await user.type(email, 'account@example.com')
  await user.click(screen.getByRole('button', { name: 'Send reset email' }))
  expect(
    await screen.findByRole('button', { name: /^Resend \(/ })
  ).toBeDisabled()
  expect(email).toHaveValue('')
  expect(get).toHaveBeenCalledWith(
    '/api/reset_password',
    expect.objectContaining({
      params: expect.objectContaining({ email: 'account@example.com' }),
    })
  )
  await user.click(screen.getByRole('button', { name: /^Resend \(/ }))
  expect(get).toHaveBeenCalledTimes(1)
})

test.each(['/sign-in', '/sign-up', '/forgot-password'] as const)(
  '%s switches the decorative artwork with the theme without clearing the form',
  async (path) => {
    const user = userEvent.setup()
    await renderAuthPage(path)
    const input = (await screen.findAllByRole('textbox'))[0]
    await user.type(input, 'preview@example.com')
    expect(document.querySelector('.auth-brand-art')).toHaveAttribute(
      'src',
      '/images/home/model-ecosystem.png'
    )
    await user.click(screen.getByRole('button', { name: 'Toggle theme' }))
    await user.click(screen.getByRole('menuitem', { name: 'Dark' }))
    await waitFor(() =>
      expect(document.querySelector('.auth-brand-art')).toHaveAttribute(
        'src',
        expect.stringContaining('model-ecosystem-dark')
      )
    )
    expect(input).toHaveValue('preview@example.com')
    await user.click(screen.getByRole('button', { name: 'Toggle theme' }))
    await user.click(screen.getByRole('menuitem', { name: 'Light' }))
    await waitFor(() =>
      expect(document.querySelector('.auth-brand-art')).toHaveAttribute(
        'src',
        '/images/home/model-ecosystem.png'
      )
    )
    expect(input).toHaveValue('preview@example.com')
  }
)
