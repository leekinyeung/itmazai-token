import type { ModelCapability } from '@/features/models/types'
import { api } from '@/lib/api'
import { requireServerSuccess } from '@/lib/server-error-message'

export type FallbackSettings = {
  enabled: boolean
}

export type FallbackTarget = {
  channel_id: number
  model: string
}

export type FallbackDocument = {
  settings: FallbackSettings
  targets: FallbackTarget[]
}

export type FallbackSnapshot = {
  revision: number
  schema_version: number
  document: FallbackDocument
  updated_at: number
}

export type FallbackChannelOption = {
  channel_id: number
  channel_name: string
  enabled: boolean
}

export type FallbackChannelModelOption = {
  model_name: string
  upstream_model: string
  capabilities: ModelCapability[]
  eligible: boolean
  unavailable_reason?: string
}

type ServerResponse<T> = { success: boolean; message?: string; data: T }

export async function getFallbackConfig(): Promise<FallbackSnapshot> {
  const response = await api.get<ServerResponse<FallbackSnapshot>>(
    '/api/fallback/config'
  )
  const snapshot = requireServerSuccess(response.data).data
  return {
    ...snapshot,
    document: {
      settings: { enabled: snapshot.document.settings?.enabled ?? false },
      targets: (snapshot.document.targets ?? []).map((target) => ({
        channel_id: target.channel_id ?? 0,
        model: target.model ?? '',
      })),
    },
  }
}

export async function saveFallbackConfig(
  baseRevision: number,
  document: FallbackDocument
): Promise<FallbackSnapshot> {
  const response = await api.put<ServerResponse<FallbackSnapshot>>(
    '/api/fallback/config',
    {
      schema_version: 6,
      base_revision: baseRevision,
      document,
    }
  )
  return requireServerSuccess(response.data).data
}

export async function getFallbackChannels(): Promise<FallbackChannelOption[]> {
  const response = await api.get<ServerResponse<FallbackChannelOption[]>>(
    '/api/fallback/channels'
  )
  return requireServerSuccess(response.data).data ?? []
}

export async function getFallbackChannelModels(
  channelID: number
): Promise<FallbackChannelModelOption[]> {
  const response = await api.get<ServerResponse<FallbackChannelModelOption[]>>(
    `/api/fallback/channels/${channelID}/models`
  )
  return (requireServerSuccess(response.data).data ?? []).map((model) => ({
    ...model,
    capabilities: model.capabilities ?? [],
  }))
}
