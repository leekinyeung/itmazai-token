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

import { changeInterfaceLanguage, i18nReady } from '@/i18n/config'
import { api } from '@/lib/api'

import { LanguagePreferencesCard } from '../components/language-preferences-card'

vi.mock('@/i18n/locales/fr.json', () => {
  throw new Error('Network unavailable')
})

const originalAdapter = api.defaults.adapter
afterEach(() => {
  api.defaults.adapter = originalAdapter
})

test('failed language resources release the preferences control and do not save user settings', async () => {
  await i18nReady
  await changeInterfaceLanguage('en')
  const adapter = vi.fn<AxiosAdapter>()
  api.defaults.adapter = adapter
  const user = userEvent.setup()
  render(<LanguagePreferencesCard profile={null} onProfileUpdate={vi.fn()} />)
  const control = screen.getByRole('combobox')
  await user.click(control)
  await user.click(await screen.findByRole('option', { name: 'Français' }))
  await waitFor(() => expect(control).toBeEnabled())
  expect(control).toHaveValue('English')
  expect(window.localStorage.getItem('i18nextLng')).toBe('en')
  expect(adapter).not.toHaveBeenCalled()
})
