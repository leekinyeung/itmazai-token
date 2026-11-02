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
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { HomeAudience } from '../components/home-audience'

const defaultMedia = window.matchMedia
const words = ['Alpha', 'Beta']

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
    ...defaultMedia(query),
    matches: false,
  }))
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

test('a held headline deletes and types the next audience instead of fading between complete words', () => {
  const view = render(<HomeAudience words={['A', 'B']} paused={false} />)
  const live = view.container.querySelector('.home-audience-live')
  expect(live).toHaveTextContent('A')
  act(() => vi.advanceTimersByTime(2400))
  act(() => vi.advanceTimersByTime(38))
  expect(live?.textContent).toBe('')
  act(() => vi.advanceTimersByTime(420))
  act(() => vi.advanceTimersByTime(75))
  expect(live).toHaveTextContent('B')
})

test('pausing retains the current partial word and resuming continues deleting it', () => {
  const view = render(<HomeAudience words={words} paused={false} />)
  act(() => vi.advanceTimersByTime(2400))
  act(() => vi.advanceTimersByTime(38))
  const live = view.container.querySelector('.home-audience-live')
  expect(live).toHaveTextContent('Alph')
  view.rerender(<HomeAudience words={words} paused />)
  act(() => vi.advanceTimersByTime(10000))
  expect(live).toHaveTextContent('Alph')
  view.rerender(<HomeAudience words={words} paused={false} />)
  act(() => vi.advanceTimersByTime(38))
  expect(live).toHaveTextContent('Alp')
})

test('reduced motion keeps the first complete audience without a blinking caret', () => {
  vi.mocked(window.matchMedia).mockImplementation((query) => ({
    ...defaultMedia(query),
    matches: query.includes('prefers-reduced-motion'),
  }))
  const view = render(<HomeAudience words={words} paused={false} />)
  act(() => vi.advanceTimersByTime(10000))
  expect(view.container).toHaveTextContent('Alpha')
  expect(view.container.querySelector('.home-audience-caret')).toBeNull()
})

test('a language change resets the phrase to its complete translated first word', () => {
  const view = render(<HomeAudience key='en' words={words} paused={false} />)
  act(() => vi.advanceTimersByTime(2400))
  act(() => vi.advanceTimersByTime(38))
  view.rerender(
    <HomeAudience key='zh' words={['团队', '开发者']} paused={false} />
  )
  expect(view.container.querySelector('.home-audience-live')).toHaveTextContent(
    '团队'
  )
  act(() => vi.advanceTimersByTime(2400))
  act(() => vi.advanceTimersByTime(38))
  expect(view.container.querySelector('.home-audience-live')).toHaveTextContent(
    '团'
  )
})

test('typing changes only the audience while retaining the translated surrounding text', () => {
  const view = render(
    <HomeAudience
      words={['A', 'B']}
      prefix='为'
      suffix='而构建'
      paused={false}
    />
  )
  const content = view.container.querySelector('.home-audience-content')
  const live = view.container.querySelector('.home-audience-live')
  expect(content?.firstChild?.textContent).toBe('为')
  expect(content?.lastChild?.textContent).toBe('而构建')
  expect(live?.textContent).toBe('A')
  act(() => vi.advanceTimersByTime(2400))
  act(() => vi.advanceTimersByTime(38))
  expect(live?.textContent).toBe('')
  expect(content?.firstChild?.textContent).toBe('为')
  expect(content?.lastChild?.textContent).toBe('而构建')
  act(() => vi.advanceTimersByTime(420))
  act(() => vi.advanceTimersByTime(75))
  expect(live?.textContent).toBe('B')
})

test('reduced motion retains a complete translated phrase without running typing timers', () => {
  vi.mocked(window.matchMedia).mockImplementation((query) => ({
    ...defaultMedia(query),
    matches: query.includes('prefers-reduced-motion'),
  }))
  const view = render(
    <HomeAudience
      words={['開発者', 'チーム']}
      suffix='のために'
      paused={false}
    />
  )
  expect(view.container).toHaveTextContent('開発者のために')
  expect(vi.getTimerCount()).toBe(0)
})
