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
'use client'

import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import { getEmbeddedFrameSandbox } from '@/lib/embedded-frame'

import { WebPreview, WebPreviewBody } from '../web-preview'

test.each(['/preview', 'about:blank', 'data:text/html,hello'])(
  'a local or opaque preview %s cannot combine scripts with the parent origin',
  (src) => {
    render(
      <WebPreview>
        <WebPreviewBody src={src} />
      </WebPreview>
    )
    const sandbox = screen
      .getByTitle('Preview')
      .getAttribute('sandbox')
      ?.split(' ')
    expect(sandbox).toContain('allow-scripts')
    expect(sandbox).not.toContain('allow-same-origin')
  }
)

test('inline HTML stays isolated even when a remote src and an origin permission are supplied', () => {
  render(
    <WebPreview>
      <WebPreviewBody
        src='https://tools.example.test'
        srcDoc='<p>Preview</p>'
        sandbox='allow-scripts allow-same-origin'
      />
    </WebPreview>
  )
  expect(
    screen.getByTitle('Preview').getAttribute('sandbox')?.split(' ')
  ).not.toContain('allow-same-origin')
})

test('an external application keeps its own storage origin inside a sandbox', () => {
  render(
    <WebPreview>
      <WebPreviewBody src='https://tools.example.test' />
    </WebPreview>
  )
  const frame = screen.getByTitle('Preview')
  expect(frame).toHaveAttribute('src', 'https://tools.example.test')
  expect(frame.getAttribute('sandbox')?.split(' ')).toContain(
    'allow-same-origin'
  )
})

test('an embedded chat can download media while remaining unable to navigate its parent', () => {
  const tokens = getEmbeddedFrameSandbox({
    src: 'https://chat.example.test',
    parentOrigin: window.location.origin,
    allowDownloads: true,
  }).split(' ')
  expect(tokens).toContain('allow-downloads')
  expect(tokens).not.toContain('allow-top-navigation')
})

test('a script-free local preview keeps an explicitly requested origin permission', () => {
  render(
    <WebPreview>
      <WebPreviewBody src='/read-only' sandbox='allow-same-origin' />
    </WebPreview>
  )
  const tokens = screen
    .getByTitle('Preview')
    .getAttribute('sandbox')
    ?.split(' ')
  expect(tokens).toContain('allow-same-origin')
  expect(tokens).not.toContain('allow-scripts')
})
