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
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'

import { ModelRatioVisualEditor } from '../model-ratio-visual-editor'

let client: QueryClient | undefined

afterEach(() => {
  client?.clear()
  localStorage.clear()
  window.getSelection()?.removeAllRanges()
  vi.restoreAllMocks()
})

async function renderEditor() {
  vi.spyOn(api, 'get').mockImplementation(async (url) => {
    if (url === '/api/pricing') {
      return { data: { success: true, data: [], vendors: [] } }
    }
    return { data: { success: true, data: {} } }
  })
  const modelRatio = JSON.stringify({
    'gpt-4.1-mini': 0.2,
    'claude-sonnet': 1.5,
  })
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  client = queryClient
  const onChange = vi.fn()
  const onBatchDiscountSave = vi.fn(async (value: string) => {
    onChange('ModelDiscount', value)
    return true
  })
  const view = render(
    <QueryClientProvider client={client}>
      <ModelRatioVisualEditor
        savedModelPrice='{}'
        savedModelRatio={modelRatio}
        savedModelDiscount='{}'
        savedCacheRatio='{}'
        savedCreateCacheRatio='{}'
        savedCompletionRatio='{}'
        savedImageRatio='{}'
        savedAudioRatio='{}'
        savedAudioCompletionRatio='{}'
        savedBillingMode='{}'
        savedBillingExpr='{}'
        modelPrice='{}'
        modelRatio={modelRatio}
        modelDiscount='{}'
        cacheRatio='{}'
        createCacheRatio='{}'
        completionRatio='{}'
        imageRatio='{}'
        audioRatio='{}'
        audioCompletionRatio='{}'
        billingMode='{}'
        billingExpr='{}'
        onChange={onChange}
        onSave={vi.fn()}
        onBatchDiscountSave={onBatchDiscountSave}
        isSaving={false}
      />
    </QueryClientProvider>
  )
  // The real page has pricing metadata loaded long before the user drags over
  // a model name, so settle the pricing query before interacting.
  await waitFor(() => expect(queryClient.isFetching()).toBe(0))
  return { view, onChange, onBatchDiscountSave }
}

// A drag-select ends with mousedown/mouseup inside the row and the browser
// then fires `click` on the row. Only that final `click` is dispatched here so
// the text selection created by the drag is still active when the row opens
// the editor.
it('keeps the drag-selected model name highlighted when the row click opens the editor', async () => {
  await renderEditor()
  const row = await screen.findByRole('row', { name: /gpt-4\.1-mini/ })
  const nameCell = within(row).getByText('gpt-4.1-mini')
  window.getSelection()?.selectAllChildren(nameCell)
  expect(String(window.getSelection())).toBe('gpt-4.1-mini')

  fireEvent.click(nameCell)

  expect(
    await screen.findByRole('region', { name: 'Edit model pricing' })
  ).toBeInTheDocument()
  expect(nameCell).toBeInTheDocument()
  expect(String(window.getSelection())).toBe('gpt-4.1-mini')
})

it('keeps other rows mounted when a different model is opened for editing', async () => {
  await renderEditor()
  const targetRow = await screen.findByRole('row', { name: /gpt-4\.1-mini/ })
  const otherName = within(
    screen.getByRole('row', { name: /claude-sonnet/ })
  ).getByText('claude-sonnet')

  fireEvent.click(within(targetRow).getByText('gpt-4.1-mini'))

  expect(
    await screen.findByRole('region', { name: 'Edit model pricing' })
  ).toBeInTheDocument()
  expect(otherName).toBeInTheDocument()
})

it('batch sets and restores the selected model discount', async () => {
  const { onBatchDiscountSave } = await renderEditor()
  const row = await screen.findByRole('row', { name: /gpt-4\.1-mini/ })

  fireEvent.click(within(row).getByRole('checkbox', { name: 'Select row' }))
  const discount = await screen.findByPlaceholderText('0.8')
  fireEvent.change(discount, { target: { value: '0.8' } })
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

  await waitFor(() =>
    expect(onBatchDiscountSave).toHaveBeenCalledWith(
      JSON.stringify({ 'gpt-4.1-mini': 0.8 }, null, 2)
    )
  )
  expect(
    screen.getByRole('spinbutton', { name: 'Model discount' })
  ).toHaveValue(0.8)

  fireEvent.click(within(row).getByRole('checkbox', { name: 'Select row' }))
  fireEvent.click(screen.getByRole('button', { name: 'Restore discount to 1' }))
  await waitFor(() =>
    expect(onBatchDiscountSave).toHaveBeenCalledWith(
      JSON.stringify({ 'gpt-4.1-mini': 1 }, null, 2)
    )
  )
  expect(
    screen.getByRole('spinbutton', { name: 'Model discount' })
  ).toHaveValue(1)
})
