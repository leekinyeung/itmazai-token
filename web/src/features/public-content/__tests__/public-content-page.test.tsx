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
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import {
  getPublicContentPage,
  getPublicContentPages,
} from '@/features/public-content/content-registry'
import {
  CompareHub,
  PublicContentPage,
} from '@/features/public-content/public-content-page'
import { useAuthStore } from '@/stores/auth-store'

vi.mock('@/components/layout', () => ({
  PublicLayout: (props: { children: React.ReactNode }) => props.children,
}))
vi.mock('@/components/rich-content', () => ({
  RichContent: (props: { content: string }) => <div>{props.content}</div>,
}))

async function renderComponent(component: React.ReactNode) {
  const root = createRootRoute({ component: () => component })
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  return render(<RouterProvider router={router} />)
}

beforeEach(() => {
  useAuthStore.getState().auth.reset()
  window.gtag = vi.fn()
})

afterEach(() => {
  cleanup()
  useAuthStore.getState().auth.reset()
  document
    .querySelectorAll('script[data-public-content-jsonld]')
    .forEach((script) => script.remove())
})

test.each([
  ['/compare/taodock-vs-openrouter', 'comparison'],
  ['/integrations/openai-sdk', 'integration'],
  ['/faq', 'faq'],
] as const)(
  'renders the %s template with one English H1 and its content sections',
  async (path, kind) => {
    const page = getPublicContentPage(path, kind)
    expect(page).not.toBeNull()
    if (!page) throw new Error(`Missing generated public content page: ${path}`)
    await renderComponent(<PublicContentPage page={page} />)

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      page.title
    )
    expect(screen.getByRole('article')).toHaveAttribute('lang', 'en')
    expect(screen.getByRole('navigation', { name: 'breadcrumb' })).toBeVisible()
    expect(
      screen.getByRole('heading', { name: 'Related resources' })
    ).toBeVisible()
    if (kind === 'integration') {
      expect(screen.getByRole('heading', { name: 'Setup steps' })).toBeVisible()
      expect(
        screen.getByRole('button', { name: /full documentation/i })
      ).toBeVisible()
    }
    if (kind === 'faq') {
      expect(page.faqItems).toHaveLength(18)
      expect(screen.getAllByRole('button', { expanded: false })).toHaveLength(
        18
      )
    }
    expect(
      document.querySelectorAll('script[data-public-content-jsonld]').length
    ).toBe(page.structuredData.length)
  }
)

test('uses authentication-aware CTA targets and records only the approved dimensions', async () => {
  const page = getPublicContentPages('comparison')[0]
  expect(page).toBeDefined()
  if (!page) throw new Error('Missing generated comparison page')
  const user = userEvent.setup()
  const view = await renderComponent(<PublicContentPage page={page} />)
  const create = screen.getByRole('button', { name: /create an account/i })
  expect(create).toHaveAttribute('href', '/sign-up')
  await user.click(create)
  expect(window.gtag).toHaveBeenCalledWith(
    'event',
    'public_content_cta_click',
    {
      kind: page.kind,
      slug: page.slug,
      placement: 'primary',
      target: '/sign-up',
    }
  )

  useAuthStore.getState().auth.setUser({ id: 1, username: 'reader', role: 1 })
  view.unmount()
  await renderComponent(<PublicContentPage page={page} />)
  expect(
    screen.getByRole('button', { name: /manage api keys/i })
  ).toHaveAttribute('href', '/keys')
})

test('the hub lists every comparison while unknown and unpublished slugs stay absent', async () => {
  await renderComponent(<CompareHub />)
  expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(5)
  expect(getPublicContentPage('/compare/not-real', 'comparison')).toBeNull()
  expect(getPublicContentPage('/blog/not-published', 'blog')).toBeNull()
  expect(
    getPublicContentPage('/use-cases/not-published', 'use-case')
  ).toBeNull()
})
