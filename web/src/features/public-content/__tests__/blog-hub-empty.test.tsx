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
import { afterEach, expect, test, vi } from 'vitest'

import { BlogHub } from '@/features/public-content/blog-hub'
import { useAuthStore } from '@/stores/auth-store'

vi.mock('@/components/layout', () => ({
  PublicLayout: (props: { children: React.ReactNode }) => props.children,
}))
vi.mock('@/features/public-content/content-registry', () => ({
  getPublicContentPages: () => [],
  PUBLIC_CONTENT: {
    blogHub: {
      path: '/blog',
      title: 'Taodock Blog',
      description:
        'Guides on choosing, operating, and optimizing an AI gateway.',
      updatedAt: '2026-11-10',
      structuredData: [
        '{"@context":"https://schema.org","@type":"CollectionPage","name":"Taodock Blog"}',
      ],
    },
  },
}))

afterEach(() => {
  cleanup()
  useAuthStore.getState().auth.reset()
  document
    .querySelectorAll('script[data-public-content-jsonld]')
    .forEach((script) => script.remove())
})

test('the blog hub shows an empty state when no articles are published', async () => {
  useAuthStore.getState().auth.reset()
  const root = createRootRoute({ component: () => <BlogHub /> })
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  render(<RouterProvider router={router} />)

  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
    'Taodock Blog'
  )
  expect(screen.getByText(/New articles are on the way/)).toBeVisible()
  expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
})
