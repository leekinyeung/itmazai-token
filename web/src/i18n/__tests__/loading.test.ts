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
import i18next from 'i18next'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
  window.localStorage.clear()
  window.localStorage.setItem('i18nextLng', 'en')
  // The shared test setup explicitly sets lng=en; release it to exercise detection.
  i18next.options.lng = undefined
})

afterEach(() => {
  vi.useRealTimers()
  vi.doUnmock('../locales/fr.json')
  window.localStorage.clear()
})

test('English boot does not register unselected language resources', async () => {
  const { default: i18n, i18nReady } = await import('../config')
  await i18nReady
  expect(i18n.t('Loading...')).toBe('Loading...')
  for (const language of ['zhCN', 'zhTW', 'fr', 'ja', 'ru', 'vi']) {
    expect(i18n.hasResourceBundle(language, 'translation')).toBe(false)
  }
})

test.each(['zhCN', 'zhTW', 'fr', 'ru', 'ja', 'vi', 'en'])(
  'switching to %s loads the resource and persists the choice',
  async (language) => {
    const {
      default: i18n,
      i18nReady,
      changeInterfaceLanguage,
    } = await import('../config')
    await i18nReady
    expect(await changeInterfaceLanguage(language)).toBe(true)
    expect(i18n.hasResourceBundle(language, 'translation')).toBe(true)
    expect(i18n.language).toBe(language)
    expect(window.localStorage.getItem('i18nextLng')).toBe(language)
  }
)

test.each([
  ['zh-Hant-TW', 'zhTW'],
  ['zh-CN', 'zhCN'],
  ['fr-FR', 'fr'],
])(
  'a saved %s preference is restored as %s during cache initialization',
  async (saved, expected) => {
    window.localStorage.setItem('i18nextLng', saved)
    const { default: i18n, i18nReady } = await import('../config')
    await i18nReady
    expect(i18n.language).toBe(expected)
    expect(i18n.hasResourceBundle(expected, 'translation')).toBe(true)
    expect(window.localStorage.getItem('i18nextLng')).toBe(expected)
  }
)

test('a failed language switch preserves the current language and can be retried', async () => {
  vi.doMock('../locales/fr.json', () => {
    throw new Error('Network unavailable')
  })
  const {
    default: i18n,
    i18nReady,
    changeInterfaceLanguage,
  } = await import('../config')
  await i18nReady
  await expect(changeInterfaceLanguage('fr')).rejects.toThrow(
    'Failed to load language resources'
  )
  expect(i18n.language).toBe('en')
  expect(window.localStorage.getItem('i18nextLng')).toBe('en')
  vi.doUnmock('../locales/fr.json')
  await expect(changeInterfaceLanguage('fr')).resolves.toBe(true)
  expect(i18n.language).toBe('fr')
})

test('a failed initial language load finishes with usable English fallback', async () => {
  window.localStorage.setItem('i18nextLng', 'fr')
  vi.doMock('../locales/fr.json', () => {
    throw new Error('Network unavailable')
  })
  const { default: i18n, i18nReady } = await import('../config')
  await i18nReady
  expect(i18n.isInitialized).toBe(true)
  expect(i18n.t('Loading...')).toBe('Loading...')
  expect(i18n.resolvedLanguage).toBe('en')
})

test('concurrent selection shares the language request and the latest choice wins', async () => {
  let complete!: (resource: {
    default: { translation: Record<string, string> }
  }) => void
  const load = vi.fn(
    () =>
      new Promise<{ default: { translation: Record<string, string> } }>(
        (resolve) => {
          complete = resolve
        }
      )
  )
  vi.doMock('../locales/fr.json', load)
  const {
    default: i18n,
    i18nReady,
    changeInterfaceLanguage,
  } = await import('../config')
  await i18nReady
  const first = changeInterfaceLanguage('fr')
  const duplicate = changeInterfaceLanguage('fr')
  const latest = changeInterfaceLanguage('zhTW')
  await latest
  await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(1))
  complete({ default: { translation: { 'Loading...': 'Chargement...' } } })
  expect(await first).toBe(false)
  expect(await duplicate).toBe(false)
  expect(i18n.language).toBe('zhTW')
})

test('a stalled resource has a bounded wait and permits a later retry', async () => {
  let started!: () => void
  const requested = new Promise<void>((resolve) => {
    started = resolve
  })
  let complete!: (resource: {
    default: { translation: Record<string, string> }
  }) => void
  vi.doMock(
    '../locales/fr.json',
    () =>
      new Promise((resolve) => {
        complete = resolve
        started()
      })
  )
  const {
    default: i18n,
    i18nReady,
    changeInterfaceLanguage,
  } = await import('../config')
  await i18nReady
  vi.useFakeTimers()
  const result = changeInterfaceLanguage('fr')
  const rejected = expect(result).rejects.toThrow(
    'Failed to load language resources'
  )
  await requested
  await vi.advanceTimersByTimeAsync(10_000)
  await rejected
  expect(i18n.language).toBe('en')
  complete({ default: { translation: { 'Loading...': 'Chargement...' } } })
  await expect(changeInterfaceLanguage('fr')).resolves.toBe(true)
})
