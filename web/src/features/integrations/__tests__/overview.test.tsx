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
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'

import { Integrations } from '@/features/integrations'
import {
  INTEGRATION_CATALOG,
  INTEGRATION_COPY,
  getIntegrationDocUrl,
} from '@/features/integrations/catalog'
import { FEATURED_INTEGRATION_GUIDES } from '@/features/integrations/featured-guides'

vi.mock('@/components/layout', () => ({
  PublicLayout: (props: { children: React.ReactNode }) => props.children,
}))

async function renderIntegrations() {
  const router = createRouter({
    routeTree: createRootRoute({ component: Integrations }),
    history: createMemoryHistory({ initialEntries: ['/integrations'] }),
  })
  await router.load()
  return render(<RouterProvider router={router} />)
}

test('the static catalog has the exact language-independent contract', () => {
  const ids = new Set<string>()
  for (const integration of INTEGRATION_CATALOG) {
    expect(Object.keys(integration).sort()).toEqual([
      'docPath',
      'icon',
      'id',
      'name',
    ])
    expect(ids.has(integration.id)).toBe(false)
    ids.add(integration.id)
    expect(integration.docPath).toMatch(
      /^\/[a-z0-9][a-z0-9/-]*\.html(?:#[a-z0-9-]+)?$/
    )
    expect(INTEGRATION_COPY.clients[integration.id]).toBeTruthy()
  }
  expect(ids.size).toBe(6)
  expect(Object.keys(INTEGRATION_COPY.clients).sort()).toEqual([...ids].sort())
  expect(FEATURED_INTEGRATION_GUIDES.map((guide) => guide.id)).toEqual([
    'cherry-studio',
    'open-webui',
    'workbuddy',
  ])
  for (const guide of FEATURED_INTEGRATION_GUIDES) {
    expect(getIntegrationDocUrl(guide.docPath, 'zhCN')).toBe(
      `https://docs.taodock.com${guide.docPath}`
    )
    expect(getIntegrationDocUrl(guide.docPath, 'en')).toBe(
      `https://docs.taodock.com/en${guide.docPath}`
    )
  }
})

test('the overview renders synchronously with native pricing and documentation anchors', async () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch')
  const view = await renderIntegrations()

  expect(
    screen.getByRole('heading', { level: 1, name: INTEGRATION_COPY.title })
  ).toBeVisible()
  expect(screen.getByText(INTEGRATION_COPY.description)).toBeVisible()
  for (const integration of INTEGRATION_CATALOG) {
    expect(
      screen.getByRole('heading', { level: 3, name: integration.name })
    ).toBeVisible()
    expect(
      screen.getByText(INTEGRATION_COPY.clients[integration.id])
    ).toBeVisible()
  }

  const pricing =
    view.container.querySelector<HTMLAnchorElement>('a[href="/pricing"]')
  expect(pricing?.tagName).toBe('A')
  expect(pricing).toHaveTextContent(INTEGRATION_COPY.pricingLink)

  const docs = [
    ...view.container.querySelectorAll<HTMLAnchorElement>(
      'a[href^="https://docs.taodock.com/"]'
    ),
  ]
  expect(docs).toHaveLength(INTEGRATION_CATALOG.length + 1)
  for (const link of docs) {
    expect(link.tagName).toBe('A')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  }
  expect(fetchSpy).not.toHaveBeenCalled()
})
