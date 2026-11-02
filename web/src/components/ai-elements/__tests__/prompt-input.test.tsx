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

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import {
  PromptInput,
  PromptInputAttachments,
  PromptInputSubmit,
  PromptInputTextarea,
} from '../prompt-input'

beforeEach(() => {
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = () => 'blob:attachment-preview'
      static revokeObjectURL = vi.fn()
    }
  )
})
afterEach(() => vi.unstubAllGlobals())

test('an attachment conversion failure retains the file and a retry submits the full data URL', async () => {
  const fetchFile = vi
    .fn()
    .mockRejectedValueOnce(new Error('Blob unavailable'))
    .mockResolvedValue({
      blob: async () => new Blob(['picture'], { type: 'image/png' }),
    })
  vi.stubGlobal('fetch', fetchFile)
  const submit = vi.fn()
  const user = userEvent.setup()
  render(
    <PromptInput onSubmit={submit}>
      <PromptInputTextarea aria-label='Message' />
      <PromptInputAttachments>
        {(file) => <span>{file.filename}</span>}
      </PromptInputAttachments>
      <PromptInputSubmit />
    </PromptInput>
  )
  await user.upload(
    screen.getByLabelText('Upload files'),
    new File(['picture'], 'picture.png', { type: 'image/png' })
  )
  await user.click(screen.getByRole('button', { name: 'Submit' }))
  expect(await screen.findByText('picture.png')).toBeVisible()
  expect(submit).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Submit' }))
  await waitFor(() =>
    expect(submit).toHaveBeenCalledWith(
      {
        text: '',
        files: [
          {
            type: 'file',
            url: 'data:image/png;base64,cGljdHVyZQ==',
            mediaType: 'image/png',
            filename: 'picture.png',
          },
        ],
      },
      expect.anything()
    )
  )
  await waitFor(() =>
    expect(screen.queryByText('picture.png')).not.toBeInTheDocument()
  )
})
