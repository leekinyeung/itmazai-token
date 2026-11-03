/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createInstance } from 'i18next'
import type { ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import { afterEach, expect, test, vi } from 'vitest'

import en from '@/i18n/locales/en.json'
import fr from '@/i18n/locales/fr.json'
import ja from '@/i18n/locales/ja.json'
import ru from '@/i18n/locales/ru.json'
import viLocale from '@/i18n/locales/vi.json'
import zhTW from '@/i18n/locales/zh-TW.json'
import zh from '@/i18n/locales/zh.json'
import * as clientHandoff from '@/lib/client-handoff'

import { HomeServerFrame } from '../components/home-server-frame'
import { Home } from '../index'
import type { HomePageContentResult } from '../types'

const homeState = vi.hoisted(() => ({
  result: {
    content: '',
    status: 'default',
    isUrl: false,
    isRefreshing: false,
    error: null,
    retry: vi.fn(),
  } as HomePageContentResult,
}))

vi.mock('../hooks', () => ({
  useHomePageContent: () => homeState.result,
}))
vi.mock('@/context/theme-provider', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (state: { auth: { user: null } }) => unknown) =>
    selector({ auth: { user: null } }),
}))
vi.mock('@/components/layout/components/public-layout', () => ({
  PublicLayout: (props: { children: ReactNode }) => props.children,
}))
vi.mock('@/components/rich-content', () => ({
  RichContent: () => <div>Custom content</div>,
}))
vi.mock('../components/home-landing', () => ({
  HomeLanding: () => <main>Default home</main>,
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
  homeState.result = {
    content: '',
    status: 'default',
    isUrl: false,
    isRefreshing: false,
    error: null,
    retry: vi.fn(),
  }
})

test('the build-time frame uses the shared hero structure in every supported language', async () => {
  for (const [language, translation] of [
    ['en', en.translation],
    ['zhCN', zh.translation],
    ['zhTW', zhTW.translation],
    ['fr', fr.translation],
    ['ja', ja.translation],
    ['ru', ru.translation],
    ['vi', viLocale.translation],
  ] as const) {
    const instance = createInstance()
    await instance.init({
      lng: language,
      fallbackLng: 'en',
      resources: { [language]: { translation } },
      interpolation: { escapeValue: false },
    })
    const view = render(
      <I18nextProvider i18n={instance}>
        <HomeServerFrame brand='TaoDock' logo='/logo.png' />
      </I18nextProvider>
    )

    expect(view.container.querySelector('.home-hero')).toBeInTheDocument()
    expect(
      view.container.querySelector('[data-fallback-i18n="Explore models"]')
    ).toHaveTextContent(
      (translation as Record<string, string>)['Explore models'] ??
        'Explore models'
    )
    expect(
      view.container.querySelector('.home-gateway[data-motion="false"]')
    ).toBeInTheDocument()
    expect(view.container.querySelector('animate')).not.toBeInTheDocument()
    const guides = [
      ...view.container.querySelectorAll<HTMLAnchorElement>(
        '.home-integration-guides a'
      ),
    ]
    const chinese = language === 'zhCN' || language === 'zhTW'
    expect(guides).toHaveLength(3)
    expect(guides.map((link) => link.getAttribute('href'))).toEqual([
      `https://docs.taodock.com${chinese ? '' : '/en'}/guide/cherry-studio.html`,
      `https://docs.taodock.com${chinese ? '' : '/en'}/guide/open-webui.html`,
      `https://docs.taodock.com${chinese ? '' : '/en'}/guide/workbuddy.html`,
    ])
    for (const link of guides) {
      expect(link.tagName).toBe('A')
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
    view.unmount()
  }
})

test('the custom-content shell preserves an administrator-defined brand', async () => {
  const instance = createInstance()
  await instance.init({
    lng: 'zh',
    resources: { zh: { translation: zh.translation } },
  })
  const { container } = render(
    <I18nextProvider i18n={instance}>
      <HomeServerFrame brand='Acme & Partners' logo='/brand.svg' custom />
    </I18nextProvider>
  )

  expect(container).toHaveTextContent('Acme & Partners')
  expect(container.querySelector('.home-hero')).not.toBeInTheDocument()
  expect(
    container.querySelector('[data-server-home-variant="custom"]')
  ).toBeInTheDocument()
})

test('the server frame remains until the hidden client root is ready', () => {
  document.body.innerHTML =
    '<div id="root"><main data-server-fallback="home">Server frame</main></div>'
  const root = document.querySelector<HTMLElement>('#root')
  if (!root) throw new Error('Root element not found')
  const clientRoot = clientHandoff.prepareClientRoot(root)
  clientRoot.textContent = 'Client page'
  let frame: FrameRequestCallback | undefined
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frame = callback
    return 1
  })

  clientHandoff.revealClientApp()
  expect(root).toHaveAttribute('data-client-pending', 'true')
  expect(root?.querySelector('[data-server-fallback]')).toBeInTheDocument()
  expect(clientRoot).toHaveAttribute('aria-hidden', 'true')

  act(() => frame?.(0))
  expect(root?.querySelector('[data-server-fallback]')).not.toBeInTheDocument()
  expect(root).not.toHaveAttribute('data-client-pending')
  expect(clientRoot).not.toHaveAttribute('aria-hidden')
})

test('a custom iframe keeps the server shell until its load event', () => {
  homeState.result = {
    content: 'https://home.example.test',
    status: 'custom',
    isUrl: true,
    isRefreshing: false,
    error: null,
    retry: vi.fn(),
  }
  const reveal = vi
    .spyOn(clientHandoff, 'revealClientApp')
    .mockImplementation(() => {})

  render(<Home />)
  expect(reveal).not.toHaveBeenCalled()
  fireEvent.load(screen.getByTitle('Custom Home Page'))
  expect(reveal).toHaveBeenCalledTimes(1)
})
