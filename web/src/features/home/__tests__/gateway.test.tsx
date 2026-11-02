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
import { act, cleanup, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { HomeGateway } from '../components/home-gateway'

const matches = new Map<string, boolean>()
const mediaQueries = new Map<string, MediaQueryList>()

beforeEach(() => {
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => {
    const previous = mediaQueries.get(query)
    if (previous) return previous
    const events = new EventTarget()
    const media: MediaQueryList = {
      get matches() {
        return matches.get(query) ?? false
      },
      media: query,
      onchange: null,
      addEventListener: events.addEventListener.bind(events),
      removeEventListener: events.removeEventListener.bind(events),
      dispatchEvent: events.dispatchEvent.bind(events),
      addListener: () => {},
      removeListener: () => {},
    }
    mediaQueries.set(query, media)
    return media
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  matches.clear()
  mediaQueries.clear()
})

test('desktop connections carry animated packets on their own paths', () => {
  const view = render(<HomeGateway logo='/logo.png' brand='Local brand' />)
  const desktop = view.container.querySelector('.home-gateway-lines')
  expect(desktop?.querySelector('animateMotion')).not.toBeNull()
  expect(
    desktop?.querySelector('animate[attributeName="stroke-dashoffset"]')
  ).not.toBeNull()
  for (const motionPath of desktop?.querySelectorAll('mpath') ?? []) {
    const target = view.container.querySelector(
      `[id="${motionPath.getAttribute('href')?.slice(1)}"]`
    )
    expect(target?.tagName.toLowerCase()).toBe('path')
    expect(target?.getAttribute('d')).toBeTruthy()
  }
  expect(
    view.container.querySelector('.home-gateway-lines-mobile animateMotion')
  ).toBeNull()
})

test('the gateway uses four hub tiles, compact nodes and a separate output sweep', () => {
  const view = render(<HomeGateway logo='/logo.png' brand='Local brand' />)
  const desktop = view.container.querySelector('.home-gateway-lines')
  expect(desktop?.querySelectorAll('[data-hub-tile]')).toHaveLength(4)
  expect(desktop?.querySelector('.home-gateway-node rect')).toHaveAttribute(
    'height',
    '33'
  )
  expect(
    desktop?.querySelector(
      '[data-outgoing="true"] animate[attributeName="opacity"]'
    )
  ).toHaveAttribute('dur', '6s')
})

test('gateway surfaces and light effects follow the system theme tokens', () => {
  const view = render(<HomeGateway logo='/logo.png' brand='Local brand' />)
  const diagram = view.container.querySelector('.home-gateway-lines')
  const tiles = diagram
    ?.getElementsByTagName('linearGradient')[0]
    ?.getElementsByTagName('stop')
  expect(tiles?.[0]).toHaveAttribute('stop-color', 'var(--card)')
  expect(tiles?.[1]).toHaveAttribute('stop-color', 'var(--muted)')
  for (const stop of diagram
    ?.getElementsByTagName('radialGradient')[0]
    ?.getElementsByTagName('stop') ?? []) {
    expect(stop).toHaveAttribute('stop-color', 'var(--primary)')
  }
  expect(diagram?.querySelector('.home-gateway-halo')).toHaveAttribute(
    'fill',
    'var(--primary)'
  )
})

test('mobile connections use vertical motion without running hidden desktop animations', () => {
  matches.set('(max-width: 1023px)', true)
  const view = render(<HomeGateway logo='/logo.png' brand='Local brand' />)
  const mobile = view.container.querySelector('.home-gateway-lines-mobile')
  expect(mobile?.querySelector('animateMotion')).not.toBeNull()
  expect(
    mobile?.querySelector('animate[attributeName="stroke-dashoffset"]')
  ).not.toBeNull()
  expect(
    view.container.querySelector('.home-gateway-lines animateMotion')
  ).toBeNull()
})

test('changing reduced motion removes all native animations while retaining the diagram', () => {
  const view = render(<HomeGateway logo='/logo.png' brand='Local brand' />)
  expect(view.container.querySelector('animateMotion')).not.toBeNull()
  act(() => {
    matches.set('(prefers-reduced-motion: reduce)', true)
    mediaQueries
      .get('(prefers-reduced-motion: reduce)')
      ?.dispatchEvent(new Event('change'))
  })
  expect(view.container.querySelector('animateMotion, animate')).toBeNull()
  expect(
    view.container.querySelector('.home-gateway-hub image')
  ).toHaveAttribute('href', '/logo.png')
  expect(
    view.container.querySelector('.home-gateway-hub image')
  ).toHaveAttribute('aria-label', 'Local brand')
  expect(view.container.querySelector('.home-gateway-lines')).toHaveTextContent(
    'OpenAI'
  )
  expect(view.container.querySelector('.home-gateway-lines')).toHaveTextContent(
    'Cherry Studio'
  )
  expect(
    view.container.querySelector('.home-gateway-lines path')
  ).not.toBeNull()
  act(() => {
    matches.set('(prefers-reduced-motion: reduce)', false)
    mediaQueries
      .get('(prefers-reduced-motion: reduce)')
      ?.dispatchEvent(new Event('change'))
  })
  expect(view.container.querySelector('animateMotion')).not.toBeNull()
})

test('starting with reduced motion retains a static mobile diagram', () => {
  matches.set('(prefers-reduced-motion: reduce)', true)
  matches.set('(max-width: 1023px)', true)
  const view = render(<HomeGateway logo='/logo.png' brand='Local brand' />)
  expect(view.container.querySelector('animateMotion, animate')).toBeNull()
  expect(
    view.container.querySelector('.home-gateway-hub image')
  ).toHaveAttribute('href', '/logo.png')
  expect(
    view.container.querySelector('.home-gateway-hub image')
  ).toHaveAttribute('aria-label', 'Local brand')
  expect(
    view.container.querySelector('.home-gateway-lines-mobile path')
  ).not.toBeNull()
})

test('resizing switches animated paths to the visible diagram', () => {
  const view = render(<HomeGateway logo='/logo.png' brand='Local brand' />)
  expect(
    view.container.querySelector('.home-gateway-lines animateMotion')
  ).not.toBeNull()
  act(() => {
    matches.set('(max-width: 1023px)', true)
    mediaQueries.get('(max-width: 1023px)')?.dispatchEvent(new Event('change'))
  })
  expect(
    view.container.querySelector('.home-gateway-lines animateMotion')
  ).toBeNull()
  expect(
    view.container.querySelector('.home-gateway-lines-mobile animateMotion')
  ).not.toBeNull()
  act(() => {
    matches.set('(max-width: 1023px)', false)
    mediaQueries.get('(max-width: 1023px)')?.dispatchEvent(new Event('change'))
  })
  expect(
    view.container.querySelector('.home-gateway-lines animateMotion')
  ).not.toBeNull()
  expect(
    view.container.querySelector('.home-gateway-lines-mobile animateMotion')
  ).toBeNull()
})

test('mobile resizing leaves the hidden desktop frame unchanged until returning to desktop', () => {
  vi.stubGlobal('innerHeight', 900)
  const view = render(<HomeGateway logo='/logo.png' brand='Local brand' />)
  const container = view.container.querySelector('.home-gateway')
  const desktop = view.container.querySelector('.home-gateway-lines')
  if (!container || !desktop) throw new Error('Missing gateway diagram')
  Object.defineProperty(container, 'clientWidth', {
    configurable: true,
    value: 1200,
  })
  act(() => window.dispatchEvent(new Event('resize')))
  expect(desktop).toHaveStyle({ height: '380px' })

  act(() => {
    matches.set('(max-width: 1023px)', true)
    mediaQueries.get('(max-width: 1023px)')?.dispatchEvent(new Event('change'))
  })
  Object.defineProperty(container, 'clientWidth', {
    configurable: true,
    value: 390,
  })
  act(() => window.dispatchEvent(new Event('resize')))
  expect(desktop).toHaveStyle({ height: '380px' })

  Object.defineProperty(container, 'clientWidth', {
    configurable: true,
    value: 1200,
  })
  vi.stubGlobal('innerHeight', 850)
  act(() => {
    matches.set('(max-width: 1023px)', false)
    mediaQueries.get('(max-width: 1023px)')?.dispatchEvent(new Event('change'))
  })
  expect(
    Number.parseFloat((desktop as SVGSVGElement).style.height)
  ).toBeCloseTo(330)
})

test('pausing and resuming preserves the SVG animation timeline', () => {
  const view = render(
    <HomeGateway logo='/logo.png' brand='Local brand' paused={false} />
  )
  const frame = view.container.querySelector('.home-gateway-lines')
  if (!frame) throw new Error('Missing gateway diagram')
  const originalMotion = frame.querySelector('animateMotion')
  const pauseAnimations = vi.fn()
  const unpauseAnimations = vi.fn()
  Object.defineProperties(frame, {
    pauseAnimations: { value: pauseAnimations },
    unpauseAnimations: { value: unpauseAnimations },
  })
  view.rerender(<HomeGateway logo='/logo.png' brand='Local brand' paused />)
  expect(pauseAnimations).toHaveBeenCalledOnce()
  expect(view.container.querySelector('.home-gateway')).toHaveAttribute(
    'data-paused',
    'true'
  )
  expect(frame.querySelector('animateMotion')).toBe(originalMotion)
  view.rerender(
    <HomeGateway logo='/logo.png' brand='Local brand' paused={false} />
  )
  expect(unpauseAnimations).toHaveBeenCalledOnce()
  expect(frame.querySelector('animateMotion')).toBe(originalMotion)
})

test('multiple diagrams do not share path identifiers and decorations cannot take focus', async () => {
  const view = render(
    <>
      <HomeGateway logo='/logo.png' brand='First brand' />
      <HomeGateway logo='/logo.png' brand='Second brand' />
      <button type='button'>Next action</button>
    </>
  )
  const ids = [...view.container.querySelectorAll('path[id]')].map(
    (path) => path.id
  )
  expect(ids.length).toBeGreaterThan(0)
  expect(new Set(ids).size).toBe(ids.length)
  for (const id of ids) expect(id).not.toMatch(/\s/)
  for (const diagram of view.container.querySelectorAll('.home-gateway')) {
    expect(diagram).toHaveAttribute('aria-hidden', 'true')
    expect(diagram.querySelector('button, a, [tabindex]')).toBeNull()
  }
  const user = userEvent.setup()
  await user.tab()
  expect(view.getByRole('button', { name: 'Next action' })).toHaveFocus()
})
