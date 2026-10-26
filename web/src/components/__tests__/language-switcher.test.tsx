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
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AxiosAdapter } from 'axios'
import { afterEach, expect, test, vi } from 'vitest'

import i18n, { changeInterfaceLanguage, i18nReady } from '@/i18n/config'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

import { LanguageSwitcher } from '../language-switcher'

vi.mock('@/i18n/locales/fr.json', () => {
  throw new Error('Network unavailable')
})

const originalAdapter = api.defaults.adapter
afterEach(() => {
  api.defaults.adapter = originalAdapter
  useAuthStore.getState().auth.reset('idle')
})

test('a language download failure leaves the trigger enabled and does not save the failed preference', async () => {
  await i18nReady
  await changeInterfaceLanguage('en')
  useAuthStore
    .getState()
    .auth.setUser({ id: 42, username: 'test-user', role: 1 })
  const adapter = vi.fn<AxiosAdapter>()
  api.defaults.adapter = adapter
  const user = userEvent.setup()
  render(<LanguageSwitcher />)
  const trigger = screen.getByRole('button', { name: 'Change language' })
  await user.click(trigger)
  await user.click(await screen.findByRole('menuitem', { name: 'Français' }))
  await waitFor(() => expect(trigger).toBeEnabled())
  expect(i18n.language).toBe('en')
  expect(window.localStorage.getItem('i18nextLng')).toBe('en')
  expect(adapter).not.toHaveBeenCalled()
})
