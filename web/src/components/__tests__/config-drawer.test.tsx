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
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ConfigDrawer } from '@/components/config-drawer'
import { SidebarProvider } from '@/components/ui/sidebar'
import { DirectionProvider } from '@/context/direction-provider'
import { LayoutProvider } from '@/context/layout-provider'
import { ThemeCustomizationProvider } from '@/context/theme-customization-provider'
import { ThemeProvider } from '@/context/theme-provider'
import { initializeFrontendCache } from '@/lib/frontend-cache'
import { THEME_STORAGE_KEYS } from '@/lib/theme-storage'

function ThemeSettings() {
  return (
    <ThemeProvider>
      <ThemeCustomizationProvider>
        <DirectionProvider>
          <LayoutProvider>
            <SidebarProvider>
              <ConfigDrawer />
            </SidebarProvider>
          </LayoutProvider>
        </DirectionProvider>
      </ThemeCustomizationProvider>
    </ThemeProvider>
  )
}

beforeEach(() => localStorage.clear())

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.clear()
  document.documentElement.classList.remove('light', 'dark')
  document.documentElement.removeAttribute('dir')
  document.body.removeAttribute('style')
  for (const attribute of document.body.getAttributeNames()) {
    if (attribute.startsWith('data-theme-')) {
      document.body.removeAttribute(attribute)
    }
  }
  for (const cookie of document.cookie.split(';')) {
    document.cookie = `${cookie.trim().split('=')[0]}=; path=/; max-age=0`
  }
})

describe('custom theme color settings', () => {
  it('selects Custom by keyboard and applies a normalized hex color on Enter', async () => {
    const user = userEvent.setup()
    render(<ThemeSettings />)
    await user.click(
      screen.getByRole('button', { name: 'Open theme settings' })
    )
    await user.click(
      screen.getByRole('radio', { name: 'preset.lavender-dream' })
    )
    await user.keyboard('{ArrowRight}')

    expect(screen.getByRole('radio', { name: 'Custom' })).toBeChecked()
    const hex = screen.getByRole('textbox', { name: 'Hex color' })
    await user.clear(hex)
    await user.type(hex, '#A3C{Enter}')

    expect(hex).toHaveValue('#aa33cc')
    expect(document.body).toHaveAttribute('data-theme-custom-color', '#aa33cc')
    expect(localStorage.getItem(THEME_STORAGE_KEYS.preset)).toBe('custom')
    expect(localStorage.getItem(THEME_STORAGE_KEYS.customColor)).toBe('#aa33cc')
    expect(document.body.style.getPropertyValue('--custom-primary')).toBe(
      '#aa33cc'
    )
  })

  it('applies the picker color immediately and restores it after remounting and cache initialization', async () => {
    const user = userEvent.setup()
    const first = render(<ThemeSettings />)
    await user.click(
      screen.getByRole('button', { name: 'Open theme settings' })
    )
    await user.click(screen.getByRole('radio', { name: 'Custom' }))
    fireEvent.change(screen.getByLabelText('Choose theme color'), {
      target: { value: '#e11d48' },
    })

    expect(screen.getByRole('textbox', { name: 'Hex color' })).toHaveValue(
      '#e11d48'
    )
    expect(document.body).toHaveAttribute('data-theme-custom-color', '#e11d48')

    first.unmount()
    initializeFrontendCache()
    render(<ThemeSettings />)
    await user.click(
      screen.getByRole('button', { name: 'Open theme settings' })
    )

    expect(screen.getByRole('radio', { name: 'Custom' })).toBeChecked()
    expect(screen.getByLabelText('Choose theme color')).toHaveValue('#e11d48')
    expect(document.body.style.getPropertyValue('--custom-primary')).toBe(
      '#e11d48'
    )
  })

  it('keeps the last valid color when invalid hex is blurred and clears the error after correction', async () => {
    localStorage.setItem(THEME_STORAGE_KEYS.preset, 'custom')
    localStorage.setItem(THEME_STORAGE_KEYS.customColor, '#16a34a')
    const user = userEvent.setup()
    render(<ThemeSettings />)
    await user.click(
      screen.getByRole('button', { name: 'Open theme settings' })
    )
    const hex = screen.getByRole('textbox', { name: 'Hex color' })

    await user.clear(hex)
    await user.type(hex, '#nope')
    await user.tab()

    expect(hex).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter a valid hex color'
    )
    expect(localStorage.getItem(THEME_STORAGE_KEYS.customColor)).toBe('#16a34a')
    expect(document.body.style.getPropertyValue('--custom-primary')).toBe(
      '#16a34a'
    )

    await user.clear(hex)
    await user.type(hex, '0D9488')
    await user.tab()

    expect(hex).toHaveValue('#0d9488')
    expect(hex).toHaveAttribute('aria-invalid', 'false')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(localStorage.getItem(THEME_STORAGE_KEYS.customColor)).toBe('#0d9488')
  })

  it('removes custom overrides when selecting a preset and remembers the color when returning', async () => {
    localStorage.setItem(THEME_STORAGE_KEYS.preset, 'custom')
    localStorage.setItem(THEME_STORAGE_KEYS.customColor, '#9333ea')
    const user = userEvent.setup()
    render(<ThemeSettings />)
    await user.click(
      screen.getByRole('button', { name: 'Open theme settings' })
    )
    await user.click(screen.getByRole('radio', { name: 'preset.anthropic' }))

    expect(document.body).toHaveAttribute('data-theme-preset', 'anthropic')
    expect(document.body).not.toHaveAttribute('data-theme-custom-color')
    expect(document.body.style.getPropertyValue('--custom-primary')).toBe('')
    expect(
      screen.queryByRole('textbox', { name: 'Hex color' })
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Custom' }))

    expect(screen.getByRole('textbox', { name: 'Hex color' })).toHaveValue(
      '#9333ea'
    )
    expect(document.body.style.getPropertyValue('--custom-primary')).toBe(
      '#9333ea'
    )
  })

  it('clears the saved custom color and restores the default appearance on Reset', async () => {
    localStorage.setItem(THEME_STORAGE_KEYS.preset, 'custom')
    localStorage.setItem(THEME_STORAGE_KEYS.customColor, '#9333ea')
    const user = userEvent.setup()
    render(<ThemeSettings />)
    await user.click(
      screen.getByRole('button', { name: 'Open theme settings' })
    )
    await user.click(
      screen.getByRole('button', {
        name: 'Reset all settings to default values',
      })
    )

    expect(document.body).toHaveAttribute('data-theme-preset', 'ocean-breeze')
    expect(document.body).not.toHaveAttribute('data-theme-custom-color')
    expect(localStorage.getItem(THEME_STORAGE_KEYS.customColor)).toBeNull()
    expect(
      document.body.style.getPropertyValue('--custom-primary-foreground')
    ).toBe('')

    await user.click(screen.getByRole('radio', { name: 'Custom' }))
    expect(screen.getByRole('textbox', { name: 'Hex color' })).toHaveValue(
      '#2563eb'
    )
  })

  it.each([
    ['light', '#ffffff', '#000000'],
    ['dark', '#000000', '#ffffff'],
  ])(
    'uses readable button text in %s mode for %s',
    (mode, color, foreground) => {
      localStorage.setItem(THEME_STORAGE_KEYS.mode, mode)
      localStorage.setItem(THEME_STORAGE_KEYS.preset, 'custom')
      localStorage.setItem(THEME_STORAGE_KEYS.customColor, color)
      render(<ThemeSettings />)

      expect(document.documentElement).toHaveClass(mode)
      expect(
        document.body.style.getPropertyValue('--custom-primary-foreground')
      ).toBe(foreground)
    }
  )

  it('falls back to the default custom color when the stored value is invalid', async () => {
    localStorage.setItem(THEME_STORAGE_KEYS.preset, 'custom')
    localStorage.setItem(
      THEME_STORAGE_KEYS.customColor,
      'url(https://example.com)'
    )
    const user = userEvent.setup()
    render(<ThemeSettings />)
    await user.click(
      screen.getByRole('button', { name: 'Open theme settings' })
    )

    expect(screen.getByRole('textbox', { name: 'Hex color' })).toHaveValue(
      '#2563eb'
    )
    expect(document.body.style.getPropertyValue('--custom-primary')).toBe(
      '#2563eb'
    )
  })
})
