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
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18next from 'i18next'
import type { ComponentProps } from 'react'
import { afterEach, expect, test } from 'vitest'

import { Home } from '@/features/home'
import { changeInterfaceLanguage, i18nReady } from '@/i18n/config'
import { INTERFACE_LANGUAGE_OPTIONS } from '@/i18n/languages'
import en from '@/i18n/locales/en.json'
import { STATUS_QUERY_KEY } from '@/lib/status-query'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { Footer } from '../components/footer'
import { PublicLayout } from '../components/public-layout'

const originalConfig = useSystemConfigStore.getState().config
let client: QueryClient

afterEach(async () => {
  cleanup()
  client?.clear()
  useSystemConfigStore.getState().setConfig(originalConfig)
  window.localStorage.clear()
  await changeInterfaceLanguage('en')
})

async function renderFooter(
  options: {
    status?: Record<string, unknown> | null
    layout?: 'container' | 'custom'
    homeContent?: string
    footerProps?: ComponentProps<typeof Footer>
  } = {}
) {
  await i18nReady
  i18next.addResourceBundle('en', 'translation', en.translation, true, true)
  await changeInterfaceLanguage('en')
  useSystemConfigStore.getState().setConfig({
    systemName: 'Taodock',
    logo: '/logo.png',
    footerHtml: '',
    demoSiteEnabled: false,
  })
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  client.setQueryData(
    STATUS_QUERY_KEY,
    options.status === undefined ? {} : options.status
  )
  client.setQueryData(['notice'], { success: true, data: '' })
  if (options.homeContent !== undefined) {
    client.setQueryData(['homePageContent'], options.homeContent)
  }
  const root = createRootRoute({
    component: () => {
      if (options.homeContent !== undefined) return <Home />
      if (!options.layout) return <Footer {...options.footerProps} />
      return (
        <PublicLayout
          showMainContainer={options.layout === 'container'}
          showNotifications={false}
          showAuthButtons={false}
          showThemeSwitch={false}
        >
          {options.layout === 'custom' ? (
            <main>
              <iframe title='Embedded content' src='about:blank' sandbox='' />
            </main>
          ) : (
            <h1>Page content</h1>
          )}
        </PublicLayout>
      )
    },
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
  return screen.findByRole('contentinfo')
}

test('a non-demo site exposes product, documentation and about destinations', async () => {
  const footer = within(await renderFooter())
  for (const [name, href] of [
    ['Model Square', '/pricing'],
    ['Rankings', '/rankings'],
    ['Console', '/dashboard'],
    ['Integrations', '/integrations'],
    ['About us', '/about'],
  ]) {
    expect(footer.getByRole('link', { name })).toHaveAttribute('href', href)
  }
  expect(
    footer.getAllByRole('link').map((link) => link.getAttribute('href'))
  ).not.toEqual(
    expect.arrayContaining([
      expect.stringMatching(
        /^\/(support(?:-prototype|-workspace)?|my-questions)(?:[/?#]|$)/
      ),
    ])
  )
  for (const path of ['quick-start.html', 'api/overview.html']) {
    const link = footer
      .getAllByRole('link')
      .find((item) => item.getAttribute('href')?.endsWith(`/en/${path}`))
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  }
  for (const [name, path] of [
    ['Cherry Studio setup guide', 'guide/cherry-studio.html'],
    ['Open WebUI configuration guide', 'guide/open-webui.html'],
    ['WorkBuddy setup guide', 'guide/workbuddy.html'],
  ]) {
    const link = footer.getByRole('link', { name })
    expect(link).toHaveAttribute('href', `https://docs.taodock.com/en/${path}`)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  }
  expect(footer.queryByText(/©/)).toBeNull()
  expect(footer.queryByRole('link', { name: 'New API' })).toBeNull()
})

test('disabled modules retain the independent integration guide group', async () => {
  const footer = within(
    await renderFooter({
      status: {
        HeaderNavModules: {
          pricing: { enabled: false },
          rankings: { enabled: false },
          console: false,
          docs: false,
          about: false,
        },
      },
    })
  )
  expect(footer.queryByRole('heading', { name: 'Products' })).toBeNull()
  expect(footer.queryByRole('heading', { name: 'Documentation' })).toBeNull()
  expect(footer.queryByRole('link', { name: 'About us' })).toBeNull()
  expect(footer.queryByRole('heading', { name: 'About' })).toBeNull()
  expect(
    footer.getByRole('heading', { name: 'Integration guides' })
  ).toBeVisible()
  expect(
    footer.getByRole('navigation', { name: 'Footer navigation' })
  ).toBeVisible()
  expect(footer.getAllByRole('link')).toHaveLength(4)
})

test('a custom documentation address replaces the handbook links without guessing paths', async () => {
  const footer = within(
    await renderFooter({
      status: {
        docs_link: 'https://knowledge.example.test/team/start?ref=site',
      },
    })
  )
  const link = footer.getByRole('link', { name: 'Developer documentation' })
  expect(link).toHaveAttribute(
    'href',
    'https://knowledge.example.test/team/start?ref=site'
  )
  expect(link).toHaveAttribute('target', '_blank')
  expect(footer.queryByRole('link', { name: 'Quick start' })).toBeNull()
  expect(
    footer.getByRole('link', { name: 'Cherry Studio setup guide' })
  ).toHaveAttribute(
    'href',
    'https://docs.taodock.com/en/guide/cherry-studio.html'
  )
})

test('all seven interface languages update brand, navigation and handbook language together', async () => {
  const footer = within(await renderFooter())
  for (const language of INTERFACE_LANGUAGE_OPTIONS) {
    await act(async () => {
      await changeInterfaceLanguage(language.code)
    })
    const chinese = language.code === 'zhCN' || language.code === 'zhTW'
    const links = footer.getAllByRole('link')
    const docs = links.filter((item) =>
      item.getAttribute('href')?.startsWith('https://docs.taodock.com/')
    )
    expect(docs).toHaveLength(5)
    expect(docs[0]).toHaveAttribute(
      'href',
      `https://docs.taodock.com/${chinese ? '' : 'en/'}quick-start.html`
    )
    expect(docs.map((item) => item.getAttribute('href'))).toEqual(
      expect.arrayContaining([
        `https://docs.taodock.com/${chinese ? '' : 'en/'}guide/cherry-studio.html`,
        `https://docs.taodock.com/${chinese ? '' : 'en/'}guide/open-webui.html`,
        `https://docs.taodock.com/${chinese ? '' : 'en/'}guide/workbuddy.html`,
      ])
    )
    expect(
      footer.getByRole('link', {
        name: chinese ? /众妙之门|眾妙之門/ : 'TaoDock',
      })
    ).toBeVisible()
    const headings = footer
      .getAllByRole('heading')
      .map((item) => item.textContent)
    expect(headings).toHaveLength(4)
    if (language.code !== 'en') expect(headings).not.toContain('Products')
  }
})

test('custom HTML retains replacement priority, legal switches and external-link protection', async () => {
  const footer = await renderFooter({
    status: { user_agreement_enabled: true, privacy_policy_enabled: false },
  })
  act(() => {
    useSystemConfigStore.getState().setConfig({
      footerHtml:
        '<p>Custom footer <a href="https://help.example.test" target="_blank">External support</a></p>',
    })
  })
  expect(await within(footer).findByText('Custom footer')).toBeVisible()
  expect(within(footer).queryByRole('heading', { name: 'Products' })).toBeNull()
  expect(
    within(footer).getByRole('link', { name: 'User Agreement' })
  ).toBeVisible()
  expect(
    within(footer).queryByRole('link', { name: 'Privacy Policy' })
  ).toBeNull()
  expect(
    within(footer).getByRole('link', { name: 'External support' })
  ).toHaveAttribute('rel', 'noopener noreferrer')
  expect(within(footer).getByRole('link', { name: 'New API' })).toBeVisible()
})

test.each(['container', 'custom'] as const)(
  'the %s public layout renders one footer after its main content',
  async (layout) => {
    const footer = await renderFooter({ layout })
    const main = screen.getByRole('main')
    expect(screen.getAllByRole('contentinfo')).toHaveLength(1)
    expect(footer.closest('main')).toBeNull()
    expect(
      main.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    if (layout === 'custom') {
      expect(screen.getByTitle('Embedded content')).toBeVisible()
    }
  }
)

test('footer destinations are keyboard reachable and disabled module links are absent', async () => {
  const user = userEvent.setup()
  const footer = within(
    await renderFooter({ status: { HeaderNavModules: { console: false } } })
  )
  await user.tab()
  expect(footer.getByRole('link', { name: 'TaoDock' })).toHaveFocus()
  await user.tab()
  expect(footer.getByRole('link', { name: 'Model Square' })).toHaveFocus()
  await user.tab()
  expect(footer.getByRole('link', { name: 'Rankings' })).toHaveFocus()
  expect(footer.queryByRole('link', { name: 'Console' })).toBeNull()
})

test.each(['https://docs.taodock.com/', 'javascript:alert(1)', 'not a URL'])(
  'the default or invalid documentation address %s uses valid handbook destinations',
  async (docs_link) => {
    const footer = within(await renderFooter({ status: { docs_link } }))
    expect(footer.getByRole('link', { name: 'Quick start' })).toHaveAttribute(
      'href',
      'https://docs.taodock.com/en/quick-start.html'
    )
    expect(
      footer.queryByRole('link', { name: 'Developer documentation' })
    ).toBeNull()
  }
)

test('hiding automatic copyright preserves configured agreement and privacy links', async () => {
  const footer = within(
    await renderFooter({
      status: { user_agreement_enabled: true, privacy_policy_enabled: true },
    })
  )
  expect(footer.getByRole('link', { name: 'User Agreement' })).toHaveAttribute(
    'href',
    '/user-agreement'
  )
  expect(footer.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
    'href',
    '/privacy-policy'
  )
  expect(footer.queryByText(/©/)).toBeNull()
  expect(footer.queryByRole('link', { name: 'New API' })).toBeNull()
})

test('an unavailable status retains default navigation and hides unconfigured legal links', async () => {
  const footer = within(await renderFooter({ status: null }))
  expect(footer.getByRole('link', { name: 'Model Square' })).toBeVisible()
  expect(footer.queryByRole('link', { name: 'User Agreement' })).toBeNull()
  expect(footer.queryByRole('link', { name: 'Privacy Policy' })).toBeNull()
})

test('custom columns and copyright remain supported while empty groups collapse', async () => {
  const footer = within(
    await renderFooter({
      footerProps: {
        columns: [
          { title: 'Empty group', links: [] },
          {
            title: 'Custom resources',
            links: [{ text: 'Resource', href: '/about' }],
          },
        ],
        copyright: 'Custom copyright',
      },
    })
  )
  expect(footer.getAllByRole('heading')).toHaveLength(1)
  expect(footer.getByRole('navigation')).toHaveClass('grid-cols-1')
  expect(footer.getByRole('link', { name: 'Resource' })).toHaveAttribute(
    'href',
    '/about'
  )
  expect(footer.getByText(/Custom copyright/)).toBeVisible()
})

test.each([
  '# Custom home',
  '<h1>Custom home</h1>',
  'https://embedded.example.test',
])(
  'the homepage with custom content %s renders a single site footer outside the content',
  async (homeContent) => {
    const footer = await renderFooter({ homeContent })
    expect(screen.getAllByRole('contentinfo')).toHaveLength(1)
    expect(footer.closest('main, iframe, .custom-home-content')).toBeNull()
  }
)

test('footer layout supports two mobile columns, four wide columns and accessible link targets', async () => {
  const footer = await renderFooter()
  const navigation = within(footer).getByRole('navigation', {
    name: 'Footer navigation',
  })
  expect(navigation).toHaveClass('grid-cols-2', 'lg:grid-cols-4')
  for (const link of within(footer).getAllByRole('link')) {
    expect(link).toHaveClass('min-h-11', 'focus-visible:ring-2')
  }
})

test('administrator branding remains complete when its name is long', async () => {
  const footer = await renderFooter()
  const name =
    'A long administrator-defined AI platform name for teams and developers'
  act(() => {
    useSystemConfigStore.getState().setConfig({ systemName: name })
  })
  const brand = within(footer).getByRole('link', { name })
  expect(brand).toBeVisible()
  expect(brand).toHaveClass('wrap-anywhere')
  expect(brand).not.toHaveClass('truncate', 'overflow-hidden')
})
