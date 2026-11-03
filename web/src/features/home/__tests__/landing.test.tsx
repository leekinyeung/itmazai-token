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
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

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
import userEvent from '@testing-library/user-event'
import i18next from 'i18next'
import { afterEach, expect, test, vi } from 'vitest'

import { Footer } from '@/components/layout/components/footer'
import { ThemeSwitch } from '@/components/theme-switch'
import { ThemeProvider } from '@/context/theme-provider'
import type { PricingData, PricingModel } from '@/features/pricing/types'
import fr from '@/i18n/locales/fr.json'
import ja from '@/i18n/locales/ja.json'
import ru from '@/i18n/locales/ru.json'
import viLocale from '@/i18n/locales/vi.json'
import zhTW from '@/i18n/locales/zh-TW.json'
import zh from '@/i18n/locales/zh.json'
import { api } from '@/lib/api'
import { STATUS_QUERY_KEY } from '@/lib/status-query'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { HomeLanding } from '../components/home-landing'

const clients: QueryClient[] = []
const originalSystemConfig = useSystemConfigStore.getState().config

afterEach(async () => {
  cleanup()
  vi.restoreAllMocks()
  clients.splice(0).forEach((client) => client.clear())
  useSystemConfigStore.getState().setConfig(originalSystemConfig)
  window.localStorage.clear()
  await i18next.changeLanguage('en')
})

async function renderLanding(
  options: {
    authenticated?: boolean
    status?: Record<string, unknown>
    footer?: boolean
    theme?: 'light' | 'dark' | 'system'
    themeControls?: boolean
    models?: PricingModel[]
    pricingState?: 'loading' | 'error'
  } = {}
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  clients.push(client)
  client.setQueryData(STATUS_QUERY_KEY, {
    server_address: 'https://gateway.example.test/',
    docs_link: 'https://docs.example.test/guide',
    privacy_policy_enabled: true,
    user_agreement_enabled: true,
    ...options.status,
  })
  if (options.pricingState) {
    vi.spyOn(api, 'get').mockImplementation(() =>
      options.pricingState === 'loading'
        ? new Promise(() => {})
        : Promise.reject(new Error('catalog offline'))
    )
  } else {
    client.setQueryData(['pricing'], {
      success: true,
      data:
        options.models ??
        [
          'alpha-chat',
          'beta-chat',
          'gamma-chat',
          'delta-chat',
          'fifth-model',
        ].map((model_name, id) => ({
          id,
          model_name,
          quota_type: 0,
          model_ratio: 1,
          completion_ratio: 3,
          enable_groups: ['default'],
          supported_endpoint_types: ['openai'],
        })),
      vendors: [],
      group_ratio: { default: 1 },
      usable_group: {},
      supported_endpoint: {
        openai: { path: '/v1/chat/completions', method: 'POST' },
      },
      auto_groups: [],
    })
  }
  const root = createRootRoute({ component: Outlet })
  const home = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: () =>
      options.footer ? (
        <Footer variant='compact' />
      ) : (
        <HomeLanding isAuthenticated={options.authenticated ?? false} />
      ),
  })
  const destinations = [
    '/pricing',
    '/pricing/$modelId',
    '/sign-in',
    '/keys',
    '/about',
  ].map((path) =>
    createRoute({
      getParentRoute: () => root,
      path,
      component: () => <h1>Destination</h1>,
    })
  )
  const router = createRouter({
    routeTree: root.addChildren([home, ...destinations]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  render(
    <QueryClientProvider client={client}>
      <ThemeProvider defaultTheme={options.theme ?? 'light'}>
        {options.themeControls && <ThemeSwitch />}
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  )
  return router
}

test('the homepage inherits the global light theme without a local mode override', async () => {
  await renderLanding({ theme: 'light' })
  const home = await screen.findByRole('main')
  expect(home).not.toHaveClass('dark')
  expect(home).not.toHaveClass('light')
  expect(document.documentElement).not.toHaveClass('dark')
  for (const name of [
    'One gateway, endless AI possibilities.',
    'One cURL command. A world of models.',
    'AT HOME IN YOUR AI TOOLKIT',
    'Send the request. Let the gateway handle the rest.',
    'Four steps. One connected workflow.',
    'Your next idea starts with one connection.',
  ]) {
    expect(screen.getByRole('region', { name })).toBeVisible()
  }
  expect(screen.queryByRole('form')).not.toBeInTheDocument()
})

test('switching the global theme updates the homepage while retaining its content and copy action', async () => {
  const user = userEvent.setup()
  const writeText = vi.spyOn(navigator.clipboard, 'writeText')
  await renderLanding({ theme: 'light', themeControls: true })
  const home = await screen.findByRole('main')
  const code = screen.getByRole('textbox', { name: 'cURL example' })
  for (const mode of ['Dark', 'Light']) {
    await user.click(screen.getByRole('button', { name: 'Toggle theme' }))
    await user.click(screen.getByRole('menuitem', { name: mode }))
    expect(document.documentElement).toHaveClass(mode.toLowerCase())
    expect(home).not.toHaveClass('dark')
    expect(home).not.toHaveClass('light')
    expect(screen.getByRole('main')).toBe(home)
    expect(screen.getByRole('textbox', { name: 'cURL example' })).toBe(code)
    expect(within(home).getByRole('heading', { level: 1 })).toBeVisible()
  }
  await user.click(screen.getByRole('button', { name: 'Copy cURL example' }))
  await waitFor(() => expect(writeText).toHaveBeenCalled())
  expect(writeText.mock.lastCall?.[0]).toContain('alpha-chat')
})

test('a saved system theme updates the homepage when the operating system changes appearance', async () => {
  const defaultMedia = window.matchMedia
  const events = new EventTarget()
  let dark = false
  const system: MediaQueryList = {
    get matches() {
      return dark
    },
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    dispatchEvent: events.dispatchEvent.bind(events),
    addListener: () => {},
    removeListener: () => {},
  }
  vi.spyOn(window, 'matchMedia').mockImplementation((query) =>
    query === system.media ? system : defaultMedia(query)
  )
  await renderLanding({ theme: 'system' })
  const home = await screen.findByRole('main')
  expect(document.documentElement).toHaveClass('light')
  expect(home).not.toHaveClass('dark')
  act(() => {
    dark = true
    system.dispatchEvent(new Event('change'))
  })
  expect(document.documentElement).toHaveClass('dark')
  expect(screen.getByRole('main')).toBe(home)
  expect(home).not.toHaveClass('dark')
  act(() => {
    dark = false
    system.dispatchEvent(new Event('change'))
  })
  expect(document.documentElement).toHaveClass('light')
  expect(home).not.toHaveClass('dark')
})

test('switching languages preserves the complete hero phrase while typing only its audience', async () => {
  const defaultMedia = window.matchMedia
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
    ...defaultMedia(query),
    matches: false,
  }))
  await renderLanding()
  await screen.findByRole('main')
  for (const [language, resource] of [
    ['en', { translation: {} }],
    ['zhCN', zh],
    ['zhTW', zhTW],
    ['fr', fr],
    ['ja', ja],
    ['ru', ru],
    ['vi', viLocale],
  ] as const) {
    i18next.addResourceBundle(
      language,
      'translation',
      resource.translation,
      true,
      true
    )
    await act(async () => {
      await i18next.changeLanguage(language)
    })
    const hero = screen.getByRole('region', {
      name: i18next.t('One gateway, endless AI possibilities.'),
    })
    expect(hero.querySelector('.home-audience-live')?.textContent).toBe(
      i18next.t('developers')
    )
    // Read the displayed phrase without its invisible width-measurement copy.
    const content = hero
      .querySelector('.home-audience-content')
      ?.cloneNode(true) as HTMLElement
    content.querySelector('.home-audience-measure')?.remove()
    expect(content.textContent).toBe(
      i18next.t('Built for {{audience}}', {
        audience: i18next.t('developers'),
      })
    )
  }
})

test('the model preview uses only the first four live catalog models', async () => {
  await renderLanding()
  const list = await screen.findByRole('list', { name: 'Current model prices' })
  expect(within(list).getAllByRole('listitem')).toHaveLength(4)
  expect(within(list).getByText('alpha-chat')).toBeVisible()
  expect(within(list).getAllByText('Input')).toHaveLength(4)
  expect(within(list).queryByText('fifth-model')).not.toBeInTheDocument()
})

test('the compact footer retains configured branding and legal links', async () => {
  useSystemConfigStore
    .getState()
    .setConfig({ systemName: 'Local brand', logo: '/logo.png', footerHtml: '' })
  await renderLanding({ footer: true })
  expect(
    await screen.findByRole('link', { name: 'Local brand' })
  ).toHaveAttribute('href', '/')
  expect(screen.getByRole('link', { name: 'User Agreement' })).toHaveAttribute(
    'href',
    '/user-agreement'
  )
  expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
    'href',
    '/privacy-policy'
  )
})

test('the default footer brand changes between TaoDock and its Chinese name with the interface language', async () => {
  useSystemConfigStore
    .getState()
    .setConfig({ systemName: 'Taodock', logo: '/logo.png', footerHtml: '' })
  await renderLanding({ footer: true })
  expect(await screen.findByRole('link', { name: 'TaoDock' })).toBeVisible()
  i18next.addResourceBundle('zhCN', 'translation', zh.translation, true, true)
  await act(async () => {
    await i18next.changeLanguage('zhCN')
  })
  expect(screen.getByRole('link', { name: '众妙之门' })).toBeVisible()
  await act(async () => {
    await i18next.changeLanguage('en')
  })
  expect(screen.getByRole('link', { name: 'TaoDock' })).toBeVisible()
})

test('a configured custom footer still takes precedence over the compact variant', async () => {
  useSystemConfigStore.getState().setConfig({
    footerHtml:
      '<p class="footer-note" style="color: rgb(120, 130, 140)"><strong>Configured footer</strong> <a href="https://support.example.test" target="_blank">Support</a><img src="/logo.png" alt="Custom logo"></p>',
  })
  await renderLanding({ footer: true })
  const text = await screen.findByText('Configured footer')
  expect(text).toBeVisible()
  expect(text.tagName).toBe('STRONG')
  expect(text.closest('.footer-note')).toHaveStyle({
    color: 'rgb(120, 130, 140)',
  })
  expect(text.closest('.custom-footer')).not.toHaveClass('prose')
  const support = screen.getByRole('link', { name: 'Support' })
  expect(support).toHaveAttribute('href', 'https://support.example.test')
  expect(support).toHaveAttribute('target', '_blank')
  expect(support.getAttribute('rel')?.split(' ')).toEqual(
    expect.arrayContaining(['noopener', 'noreferrer'])
  )
  expect(screen.getByRole('img', { name: 'Custom logo' })).toHaveAttribute(
    'src',
    '/logo.png'
  )
  expect(screen.getByRole('link', { name: 'User Agreement' })).toBeVisible()
})

test.each([false, true])(
  'the API key action keeps its destination for authenticated=%s',
  async (authenticated) => {
    await renderLanding({ authenticated })
    const action = await screen.findByRole('button', { name: 'Get an API key' })
    const url = new URL(
      action.getAttribute('href') ?? '',
      window.location.origin
    )
    expect(url.pathname).toBe(authenticated ? '/keys' : '/sign-in')
    expect(url.searchParams.get('redirect')).toBe(
      authenticated ? null : '/keys'
    )
  }
)

test('copying cURL includes a real OpenAI model, a key variable and the complete body', async () => {
  const user = userEvent.setup()
  const writeText = vi.spyOn(navigator.clipboard, 'writeText')
  await renderLanding({
    status: { server_address: 'https://gateway.example.test/v1///' },
  })
  await user.click(
    await screen.findByRole('button', { name: 'Copy cURL example' })
  )
  await waitFor(() => expect(writeText).toHaveBeenCalled())
  const command = writeText.mock.lastCall?.[0]
  expect(command).toContain('https://gateway.example.test/v1/chat/completions')
  expect(command).toContain('"model": "alpha-chat"')
  expect(command).toContain('$TAODOCK_API_KEY')
  expect(command).toMatch(/"content":\s*"Hello!"/)
  expect(command).not.toContain('/v1/v1/')
  expect(command).not.toMatch(/^\+/m)
})

test.each(['empty', 'anthropic'] as const)(
  'a catalog with %s OpenAI models falls back to listing models',
  async (kind) => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')
    const models: PricingModel[] =
      kind === 'empty'
        ? []
        : [
            {
              id: 1,
              model_name: 'claude-only',
              quota_type: 0,
              model_ratio: 1,
              completion_ratio: 1,
              enable_groups: ['default'],
              supported_endpoint_types: ['anthropic'],
            },
          ]
    await renderLanding({ models })
    if (kind === 'empty') {
      expect(
        await screen.findByText('No models are available yet.')
      ).toBeVisible()
    }
    await user.click(
      await screen.findByRole('button', { name: 'Copy cURL example' })
    )
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        expect.stringContaining('https://gateway.example.test/v1/models')
      )
    )
    expect(writeText.mock.lastCall?.[0]).not.toContain('--data')
  }
)

test('loading the catalog shows an accessible skeleton instead of prices', async () => {
  await renderLanding({ pricingState: 'loading' })
  expect(
    await screen.findByRole('status', { name: 'Loading models' })
  ).toBeVisible()
  expect(
    screen.queryByRole('list', { name: 'Current model prices' })
  ).not.toBeInTheDocument()
})

test('a catalog error provides the model-square fallback without invented prices', async () => {
  await renderLanding({ pricingState: 'error' })
  expect(
    await screen.findByText('Model prices are temporarily unavailable.')
  ).toBeVisible()
  expect(
    screen.queryByRole('list', { name: 'Current model prices' })
  ).not.toBeInTheDocument()
  const pricingLinks = screen.getAllByRole('button', {
    name: 'Browse all models and pricing',
  })
  expect(pricingLinks.length).toBeGreaterThan(0)
  for (const link of pricingLinks) {
    expect(link.tagName).toBe('A')
    expect(link).toHaveAttribute('href', '/pricing')
  }
  const integrations = screen.getByRole('button', {
    name: 'Explore integrations',
  })
  expect(integrations.tagName).toBe('A')
  expect(integrations).toHaveAttribute('href', '/integrations')
})

test('featured integration guides are native localized documentation anchors', async () => {
  await renderLanding()
  for (const [name, path] of [
    ['Cherry Studio setup guide', 'guide/cherry-studio.html'],
    ['Open WebUI configuration guide', 'guide/open-webui.html'],
    ['WorkBuddy setup guide', 'guide/workbuddy.html'],
  ]) {
    const link = screen.getByRole('button', { name })
    expect(link.tagName).toBe('A')
    expect(link).toHaveAttribute('href', `https://docs.taodock.com/en/${path}`)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  }

  i18next.addResourceBundle('zhCN', 'translation', zh.translation, true, true)
  await act(async () => {
    await i18next.changeLanguage('zhCN')
  })
  expect(
    screen.getByRole('button', { name: 'Cherry Studio 接入教程' })
  ).toHaveAttribute('href', 'https://docs.taodock.com/guide/cherry-studio.html')
  expect(
    screen.getByRole('button', { name: 'Open WebUI 配置指南' })
  ).toHaveAttribute('href', 'https://docs.taodock.com/guide/open-webui.html')
  expect(
    screen.getByRole('button', { name: 'WorkBuddy 接入教程' })
  ).toHaveAttribute('href', 'https://docs.taodock.com/guide/workbuddy.html')
})

test.each([
  ['https://docs.example.test/guide', '_blank'],
  ['/about', null],
])('documentation uses configured URL %s', async (url, target) => {
  await renderLanding({ status: { docs_link: url } })
  const guide = (
    await screen.findAllByRole('button', { name: 'Integration guide' })
  )[0]
  expect(guide).toHaveAttribute('href', url)
  expect(guide.getAttribute('target')).toBe(target)
  if (target) expect(guide).toHaveAttribute('rel', 'noopener noreferrer')
})

test('opening a real model uses the existing model detail route', async () => {
  const user = userEvent.setup()
  const router = await renderLanding()
  await user.click(await screen.findByRole('link', { name: 'alpha-chat' }))
  await screen.findByRole('heading', { name: 'Destination' })
  expect(router.state.location.pathname).toBe('/pricing/alpha-chat')
})

test('the accordion opens from the keyboard and exposes its description', async () => {
  const user = userEvent.setup()
  await renderLanding()
  const trigger = await screen.findByRole('button', {
    name: /API key management/,
  })
  trigger.focus()
  await user.keyboard('{Enter}')
  expect(trigger).toHaveAttribute('aria-expanded', 'true')
  expect(
    screen.getByText(
      'Create dedicated keys for your apps and manage their access and quotas.'
    )
  ).toBeVisible()
})

test('a language change updates the homepage and preserves custom branding', async () => {
  useSystemConfigStore.getState().setConfig({ systemName: 'Local brand' })
  await renderLanding()
  await screen.findByRole('heading', { level: 1 })
  i18next.addResourceBundle('zh', 'translation', zh.translation, true, true)
  await act(async () => {
    await i18next.changeLanguage('zh')
  })
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
    '一个网关，连接 AI 的无限可能'
  )
  expect(screen.getAllByText('Local brand').length).toBeGreaterThan(0)
  expect(screen.getAllByRole('button', { name: '接入指南' })[0]).toBeVisible()
})

test('the homepage retains dynamic and request pricing semantics from the model square', async () => {
  useSystemConfigStore.getState().setConfig({
    currency: { ...originalSystemConfig.currency, quotaDisplayType: 'USD' },
  })
  await renderLanding({
    models: [
      {
        id: 1,
        model_name: 'dynamic-model',
        quota_type: 0,
        model_ratio: 1,
        completion_ratio: 1,
        enable_groups: ['default'],
        billing_mode: 'tiered_expr',
        billing_expr: 'tier("standard", p * 5 + c * 25)',
      },
      {
        id: 2,
        model_name: 'request-model',
        quota_type: 1,
        model_ratio: 1,
        completion_ratio: 1,
        model_price: 0.02,
        enable_groups: ['default'],
      },
    ],
  })
  const list = await screen.findByRole('list', { name: 'Current model prices' })
  const rows = within(list).getAllByRole('listitem')
  expect(rows[0]).toHaveTextContent('Input5')
  expect(rows[0]).toHaveTextContent('Output25')
  expect(rows[0]).toHaveTextContent('USD / 1M tokens')
  expect(rows[1]).toHaveTextContent('Per-request0.02')
  expect(rows[1]).toHaveTextContent('USD / request')
})

test('copying the base URL falls back to this origin when no address is configured', async () => {
  const user = userEvent.setup()
  const writeText = vi.spyOn(navigator.clipboard, 'writeText')
  await renderLanding({ status: { server_address: '' } })
  await user.click(
    await screen.findByRole('button', { name: 'Copy API base URL' })
  )
  await waitFor(() =>
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/v1`)
  )
})

test('homepage animations can be paused and resumed together from the keyboard', async () => {
  const user = userEvent.setup()
  await renderLanding()
  const pause = await screen.findByRole('button', { name: 'Pause animations' })
  const gateway = document.querySelector('.home-gateway-lines')
  if (!gateway) throw new Error('Missing gateway diagram')
  const pauseAnimations = vi.fn()
  const unpauseAnimations = vi.fn()
  Object.defineProperties(gateway, {
    pauseAnimations: { value: pauseAnimations },
    unpauseAnimations: { value: unpauseAnimations },
  })
  pause.focus()
  await user.keyboard('{Enter}')
  const resume = screen.getByRole('button', { name: 'Resume animations' })
  expect(resume).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('main')).toHaveAttribute(
    'data-animations-paused',
    'true'
  )
  expect(pauseAnimations).toHaveBeenCalledOnce()
  await user.keyboard('{Enter}')
  expect(
    screen.getByRole('button', { name: 'Pause animations' })
  ).toHaveAttribute('aria-pressed', 'false')
  expect(screen.getByRole('main')).toHaveAttribute(
    'data-animations-paused',
    'false'
  )
  expect(unpauseAnimations).toHaveBeenCalledOnce()
})

test('protocol cards use the canonical name, real model count and configured documentation', async () => {
  await renderLanding()
  expect(await screen.findByRole('heading', { name: 'OpenAI' })).toBeVisible()
  expect(screen.getByText('5 compatible models')).toBeVisible()
  expect(
    screen.getAllByRole('button', { name: 'Integration guide' }).at(-1)
  ).toHaveAttribute('href', 'https://docs.example.test/guide')
})

test('the copied request stays complete in a compact mobile-friendly example', async () => {
  const user = userEvent.setup()
  const writeText = vi.spyOn(navigator.clipboard, 'writeText')
  await renderLanding()
  await user.click(
    await screen.findByRole('button', { name: 'Copy cURL example' })
  )
  await waitFor(() => expect(writeText).toHaveBeenCalled())
  const command = writeText.mock.lastCall?.[0] ?? ''
  expect(command.split('\n').length).toBeLessThanOrEqual(9)
  expect(command).toContain('"messages": [{"role":"user","content":"Hello!"}]')
})

test('a long model identifier retains its complete name, detail URL and request price', async () => {
  const name = 'organization/a-very-long-multimodal-model-name:free'
  await renderLanding({
    models: [
      {
        id: 1,
        model_name: name,
        quota_type: 1,
        model_ratio: 1,
        completion_ratio: 1,
        model_price: 0.02,
        enable_groups: ['default'],
        supported_endpoint_types: ['openai'],
      },
    ],
  })
  const list = await screen.findByRole('list', { name: 'Current model prices' })
  expect(within(list).getByRole('link', { name })).toHaveAttribute(
    'href',
    `/pricing/${encodeURIComponent(name)}`
  )
  expect(list).toHaveTextContent('Per-request0.02')
  expect(list).toHaveTextContent('USD / request')
})

test('the compact request preview stacks its columns and wraps price headings and units', async () => {
  const stylesheet = document.createElement('style')
  const previewPath = resolve('src/styles/home-live-preview.css')
  stylesheet.textContent = readFileSync(resolve('src/styles/home.css'), 'utf8')
  if (existsSync(previewPath)) {
    stylesheet.textContent += readFileSync(previewPath, 'utf8')
  }
  document.head.append(stylesheet)
  try {
    await renderLanding()
    const section = await screen.findByRole('region', {
      name: 'One cURL command. A world of models.',
    })
    const grid = section.querySelector('.home-live-grid')
    const terminal = section.querySelector('.home-terminal')
    const label = within(section).getByText('Standard price').parentElement
    if (!grid || !terminal || !label) {
      throw new Error('Missing live preview content')
    }
    expect(window.getComputedStyle(grid).gridTemplateColumns).toBe(
      'minmax(0, 1fr)'
    )
    expect(window.getComputedStyle(label).flexWrap).toBe('wrap')
    const caption = within(section).getAllByText('USD / 1M tokens')[0]
    expect(window.getComputedStyle(caption).whiteSpace).toBe('normal')
    expect(window.getComputedStyle(terminal).minWidth).toBe('0px')
    const desktop = [...(stylesheet.sheet?.cssRules ?? [])].find(
      (rule): rule is CSSMediaRule =>
        rule instanceof CSSMediaRule &&
        rule.conditionText === '(min-width: 1024px)'
    )
    const desktopGrid = [...(desktop?.cssRules ?? [])].find(
      (rule): rule is CSSStyleRule =>
        rule instanceof CSSStyleRule && rule.selectorText === '.home-live-grid'
    )
    expect(desktopGrid?.style.getPropertyValue('grid-template-columns')).toBe(
      'minmax(0, 5fr) minmax(0, 7fr)'
    )
  } finally {
    stylesheet.remove()
  }
})

test('the request example precedes model prices in visual reading and keyboard order', async () => {
  await renderLanding()
  const section = await screen.findByRole('region', {
    name: 'One cURL command. A world of models.',
  })
  const copy = within(section).getByRole('button', {
    name: 'Copy cURL example',
  })
  const prices = within(section).getByRole('list', {
    name: 'Current model prices',
  })
  const firstModel = within(prices).getByRole('link', { name: 'alpha-chat' })
  expect(
    copy.compareDocumentPosition(firstModel) & Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy()
  expect(
    within(section)
      .getByRole('heading', { level: 2 })
      .compareDocumentPosition(copy) & Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy()
})

test.each(['', '   '])(
  'an invalid OpenAI identifier %j falls back to the model-list request',
  async (name) => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')
    await renderLanding({
      models: [
        {
          id: 1,
          model_name: name,
          quota_type: 0,
          model_ratio: 1,
          completion_ratio: 1,
          enable_groups: ['default'],
          supported_endpoint_types: ['openai'],
        },
      ],
    })
    await user.click(
      await screen.findByRole('button', { name: 'Copy cURL example' })
    )
    await waitFor(() => expect(writeText).toHaveBeenCalled())
    expect(writeText.mock.lastCall?.[0]).toContain(
      'https://gateway.example.test/v1/models'
    )
    expect(writeText.mock.lastCall?.[0]).not.toContain('--data')
    expect(screen.getByText('No models are available yet.')).toBeVisible()
    expect(
      screen.queryByRole('list', { name: 'Current model prices' })
    ).not.toBeInTheDocument()
  }
)

test('copying a shell-quoted model and address preserves their literal values', async () => {
  const user = userEvent.setup()
  const writeText = vi.spyOn(navigator.clipboard, 'writeText')
  const modelName = `org/model's-$(echo sample)-"quoted"`
  await renderLanding({
    status: { server_address: `https://gateway.example.test/api's` },
    models: [
      {
        id: 1,
        model_name: modelName,
        quota_type: 0,
        model_ratio: 1,
        completion_ratio: 1,
        enable_groups: ['default'],
        supported_endpoint_types: ['openai'],
      },
    ],
  })
  const copy = await screen.findByRole('button', { name: 'Copy cURL example' })
  copy.focus()
  await user.keyboard('{Enter}')
  await waitFor(() => expect(writeText).toHaveBeenCalled())
  const command = writeText.mock.lastCall?.[0] ?? ''
  expect(command).toContain(
    `curl 'https://gateway.example.test/api'\\''s/v1/chat/completions'`
  )
  const payload = command.match(/--data '([\s\S]*)'$/)?.[1]
  if (!payload) {
    throw new Error('Missing cURL JSON body')
  }
  expect(JSON.parse(payload.replaceAll("'\\''", "'"))).toEqual({
    model: modelName,
    messages: [{ role: 'user', content: 'Hello!' }],
  })
})

test('refreshing the catalog updates both the model price and the copied request', async () => {
  const user = userEvent.setup()
  const writeText = vi.spyOn(navigator.clipboard, 'writeText')
  await renderLanding()
  await user.click(
    await screen.findByRole('button', { name: 'Copy cURL example' })
  )
  await waitFor(() => expect(writeText).toHaveBeenCalled())
  expect(writeText.mock.lastCall?.[0]).toContain('alpha-chat')
  const client = clients.at(-1)
  const previous = client?.getQueryData<PricingData>(['pricing'])
  if (!client || !previous) {
    throw new Error('Missing cached pricing catalog')
  }
  await act(async () => {
    client.setQueryData<PricingData>(['pricing'], {
      ...previous,
      data: [
        {
          ...previous.data[0],
          model_name: 'refreshed-chat',
          quota_type: 1,
          model_price: 0.125,
        },
      ],
    })
  })
  const list = await screen.findByRole('list', { name: 'Current model prices' })
  await within(list).findByRole('link', { name: 'refreshed-chat' })
  expect(list).toHaveTextContent('Per-request0.125')
  expect(list).toHaveTextContent('USD / request')
  await user.click(
    await screen.findByRole('button', { name: 'Copy cURL example' })
  )
  await waitFor(() =>
    expect(writeText.mock.lastCall?.[0]).toContain('refreshed-chat')
  )
  expect(writeText.mock.lastCall?.[0]).not.toContain('alpha-chat')
})
