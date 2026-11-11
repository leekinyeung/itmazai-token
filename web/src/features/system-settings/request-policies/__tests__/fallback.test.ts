import { afterEach, describe, expect, it, vi } from 'vitest'

import { ADMIN_PERMISSION_RESOURCES } from '@/lib/admin-permissions'
import { api } from '@/lib/api'

import {
  getFallbackChannelModels,
  getFallbackChannels,
  getFallbackConfig,
  saveFallbackConfig,
  type FallbackDocument,
} from '../fallback-api'
import { createFallbackFormSchema } from '../fallback-form'

const document: FallbackDocument = {
  settings: { enabled: false },
  targets: [],
}

afterEach(() => vi.restoreAllMocks())

describe('ordered exact fallback targets', () => {
  it('normalizes missing targets', async () => {
    vi.spyOn(api, 'get').mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          revision: 1,
          schema_version: 6,
          document: { settings: document.settings },
          updated_at: 100,
        },
      },
    })

    const snapshot = await getFallbackConfig()
    expect(snapshot.document.targets).toEqual([])
  })

  it('publishes schema v6 with ordered exact targets', async () => {
    const configured: FallbackDocument = {
      settings: { enabled: true },
      targets: [
        { channel_id: 17, model: 'fallback-chat' },
        { channel_id: 21, model: 'fallback-vision' },
      ],
    }
    vi.spyOn(api, 'put').mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          revision: 8,
          schema_version: 6,
          document: configured,
          updated_at: 100,
        },
      },
    })

    await expect(saveFallbackConfig(7, configured)).resolves.toMatchObject({
      revision: 8,
    })
    expect(api.put).toHaveBeenCalledExactlyOnceWith('/api/fallback/config', {
      schema_version: 6,
      base_revision: 7,
      document: configured,
    })
  })

  it('loads channels and only the selected channel models', async () => {
    vi.spyOn(api, 'get')
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: [
            {
              channel_id: 17,
              channel_name: 'fallback-provider',
              channel_type: 1,
              model_count: 2,
              enabled: true,
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: [
            {
              model_name: 'fallback-chat',
              upstream_model: 'provider-chat',
              capabilities: null,
              capability_metadata_status: 'complete',
              eligible: true,
            },
          ],
        },
      })

    await expect(getFallbackChannels()).resolves.toHaveLength(1)
    await expect(getFallbackChannelModels(17)).resolves.toEqual([
      expect.objectContaining({
        model_name: 'fallback-chat',
        capabilities: [],
      }),
    ])
    expect(api.get).toHaveBeenNthCalledWith(1, '/api/fallback/channels')
    expect(api.get).toHaveBeenNthCalledWith(
      2,
      '/api/fallback/channels/17/models'
    )
  })

  it('requires complete, unique targets when fallback is enabled', () => {
    const schema = createFallbackFormSchema((key) => key)
    expect(schema.safeParse({ enabled: true, targets: [] }).success).toBe(false)
    expect(
      schema.safeParse({
        enabled: true,
        targets: [{ channel_id: 17, model: 'fallback-chat' }],
      }).success
    ).toBe(true)
    expect(
      schema.safeParse({
        enabled: true,
        targets: [
          { channel_id: 17, model: 'fallback-chat' },
          { channel_id: 17, model: 'fallback-chat' },
        ],
      }).success
    ).toBe(false)
  })

  it('keeps the existing permission resource name', () => {
    expect(ADMIN_PERMISSION_RESOURCES.FALLBACK_POLICY).toBe('fallback_policy')
  })
})
