import { expect, test } from 'vitest'

import { DEFAULT_CONFIG, DEFAULT_PARAMETER_ENABLED } from '../../../constants'
import type { Message } from '../../../types'
import { buildChatCompletionPayload } from '../payload-builder'

test('chat payload does not send a legacy group field', () => {
  const messages: Message[] = [
    {
      key: 'user-1',
      from: 'user',
      versions: [{ id: 'v1', content: 'Hello' }],
    },
  ]

  const payload = buildChatCompletionPayload(
    messages,
    DEFAULT_CONFIG,
    DEFAULT_PARAMETER_ENABLED
  )

  expect(payload).not.toHaveProperty('group')
  expect(payload.model).toBe(DEFAULT_CONFIG.model)
})
