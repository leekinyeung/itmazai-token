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
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { afterAll, beforeAll, expect, test } from 'vitest'

const stylesheet = document.createElement('style')

beforeAll(() => {
  stylesheet.textContent = [
    'home.css',
    'home-hero.css',
    'home-live-preview.css',
  ]
    .map((name) => readFileSync(resolve('src/styles', name), 'utf8'))
    .join('\n')
  document.head.append(stylesheet)
})

afterAll(() => stylesheet.remove())

function homeDeclaration(selector: string, property: string): string {
  let value = ''
  for (const rule of stylesheet.sheet?.cssRules ?? []) {
    if (!(rule instanceof CSSStyleRule)) continue
    if (
      !rule.selectorText.split(',').some((item) => item.trim() === selector)
    ) {
      continue
    }
    value = rule.style.getPropertyValue(property) || value
  }
  return value
}

test('the homepage inherits the shared palette instead of redefining system theme tokens', () => {
  for (const token of [
    'background',
    'foreground',
    'primary',
    'primary-foreground',
    'card',
    'muted',
    'muted-foreground',
    'border',
    'ring',
    'font-body',
    'radius',
  ]) {
    expect(homeDeclaration('.home-main', `--${token}`)).toBe('')
  }
  expect(homeDeclaration('.home-main', 'background')).toBe('var(--background)')
  expect(homeDeclaration('.home-main', 'color')).toBe('var(--foreground)')
  expect(homeDeclaration('.home-main', 'color-scheme')).toBe('')
})

test.each([
  [
    '.home-main .home-primary-action',
    'background',
    'var(--home-action-background)',
  ],
  ['.home-main .home-primary-action', 'color', 'var(--primary-foreground)'],
  ['.home-main .home-secondary-action', 'background', 'var(--background)'],
  ['.home-price-panel', 'background', 'var(--card)'],
  ['.home-terminal', 'background', 'var(--card)'],
  ['.home-protocol-panel', 'background', 'var(--card)'],
  ['.home-step-grid > li', 'background', 'var(--card)'],
  ['.home-gateway-node > rect', 'fill', 'var(--card)'],
  ['.home-gateway-node text', 'fill', 'var(--foreground)'],
  [
    ".home-capability-list [aria-expanded='true']",
    'color',
    'var(--foreground)',
  ],
])(
  'the %s %s follows its semantic theme token',
  (selector, property, value) => {
    expect(homeDeclaration(selector, property)).toBe(value)
  }
)

test('homepage headings, cards and actions follow the shared font and radius axes', () => {
  expect(homeDeclaration('.home-main h1', 'font-family')).toBe(
    'var(--font-body)'
  )
  expect(homeDeclaration('.home-step-copy h3', 'font-family')).toBe(
    'var(--font-body)'
  )
  expect(homeDeclaration('.home-price-panel', 'border-radius')).toBe(
    'var(--radius-xl)'
  )
  expect(homeDeclaration('.home-protocol-panel', 'border-radius')).toBe(
    'var(--radius-xl)'
  )
  expect(
    homeDeclaration('.home-main .home-primary-action', 'border-radius')
  ).toBe('var(--radius-lg)')
})

test('the hero glow follows the selected primary color and cannot intercept input', () => {
  const background = homeDeclaration('.home-hero::before', 'background')
  expect(background).toContain('var(--primary)')
  expect(background).not.toContain('ambient.webp')
  expect(homeDeclaration('.home-hero::before', 'pointer-events')).toBe('none')
  expect(homeDeclaration('.home-gateway', 'pointer-events')).toBe('none')
})
