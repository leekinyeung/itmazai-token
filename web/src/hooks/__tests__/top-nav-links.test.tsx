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
import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useTopNavLinks } from '../use-top-nav-links'

const mocks = vi.hoisted(() => ({
  status: {
    header_nav_modules: JSON.stringify({
      home: true,
      console: true,
      pricing: { enabled: true, requireAuth: false },
      rankings: { enabled: true, requireAuth: false },
      docs: true,
    }),
  },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({ status: mocks.status }),
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({ auth: null }),
}))

describe('useTopNavLinks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('places the public model evaluation tool after Model Square', () => {
    const { result } = renderHook(useTopNavLinks)
    const titles = result.current.map((link) => link.title)
    const modelSquareIndex = titles.indexOf('Model Square')

    expect(titles[modelSquareIndex + 1]).toBe('Model Evaluation')
    expect(result.current[modelSquareIndex + 1]).toMatchObject({
      href: '/model-evaluation',
    })
    expect(result.current[modelSquareIndex + 1]?.requiresAuth).toBeFalsy()
  })
})
