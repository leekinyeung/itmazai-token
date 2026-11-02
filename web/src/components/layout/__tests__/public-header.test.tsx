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
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import {
  cleanup,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test } from 'vitest'

import { changeInterfaceLanguage, i18nReady } from '@/i18n/config'
import { STATUS_QUERY_KEY } from '@/lib/status-query'

import { PublicHeader } from '../components/public-header'

let client: QueryClient

afterEach(async () => {
  cleanup()
  client?.clear()
  await changeInterfaceLanguage('en')
})

async function renderHeader() {
  await i18nReady
  await changeInterfaceLanguage('en')
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  client.setQueryData(STATUS_QUERY_KEY, {})
  client.setQueryData(['notice'], { success: true, data: '' })
  const root = createRootRoute({
    component: () => (
      <PublicHeader
        showAuthButtons={false}
        showNotifications={false}
        showThemeSwitch={false}
        logo={<span>Logo</span>}
        siteName='Gateway'
      />
    ),
  })
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

test('the mobile menu exposes all seven languages and updates its flag after selection', async () => {
  const user = userEvent.setup()
  await renderHeader()
  await user.click(
    await screen.findByRole('button', { name: 'Toggle navigation menu' })
  )
  const menu = await screen.findByRole('dialog', {
    name: 'Toggle navigation menu',
  })
  await user.click(
    within(menu).getByRole('button', { name: 'Change language' })
  )
  const languages = await screen.findAllByRole('menuitem')
  expect(languages).toHaveLength(7)
  await user.click(screen.getByRole('menuitem', { name: '简体中文' }))
  await waitFor(() =>
    expect(
      within(menu)
        .getByRole('button', { name: '更改语言' })
        .querySelector('img')
    ).toHaveAttribute('src', '/flags/cn.svg')
  )
})

test('the closed mobile menu is absent and Escape restores focus to its trigger', async () => {
  const user = userEvent.setup()
  await renderHeader()
  const trigger = await screen.findByRole('button', {
    name: 'Toggle navigation menu',
  })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  trigger.focus()
  await user.keyboard('{Enter}')
  expect(await screen.findByRole('dialog')).toBeVisible()
  await user.keyboard('{Escape}')
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  )
  expect(trigger).toHaveFocus()
})
