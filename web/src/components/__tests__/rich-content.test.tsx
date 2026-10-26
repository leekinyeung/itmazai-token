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
import { render, waitFor } from '@testing-library/react'
import { expect, test } from 'vitest'

import { RichContent } from '../rich-content'

test('lazy Markdown retains headings and math rendering', async () => {
  const view = render(
    <RichContent content={'# Custom Markdown\n\n$$\\frac{1}{2}$$'} />
  )
  expect(
    await view.findByRole('heading', { name: 'Custom Markdown' })
  ).toBeVisible()
  expect(
    view.getByRole('math', { hidden: true }).querySelector('mfrac')
  ).not.toBeNull()
})

test('lazy HTML retains sanitization and the isolated homepage boundary', async () => {
  const content =
    '<h1>Custom HTML</h1><script>window.unsafe = true</script><img src="/logo.png" onerror="alert(1)">'
  const view = render(
    <RichContent
      mode='html'
      htmlVariant='isolated'
      className='custom-home-content'
      content={content}
    />
  )
  await waitFor(() => {
    const shadow = view.container.querySelector(
      '.custom-home-content'
    )?.shadowRoot
    expect(shadow?.querySelector('h1')).toHaveTextContent('Custom HTML')
    expect(shadow?.querySelector('script')).toBeNull()
    expect(shadow?.querySelector('img')).not.toHaveAttribute('onerror')
  })
})
