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
import { getServerErrorMessage } from '@/lib/server-error-message'

import type { ModelOption } from './types'

const MODEL_ENDPOINT_ERROR_DETAIL_MAX_LENGTH = 1000

export class ModelEndpointError extends Error {
  constructor(
    public readonly translationKey: string,
    public readonly detail?: string
  ) {
    super(detail || translationKey)
    this.name = 'ModelEndpointError'
  }
}

function modelEndpointUrl(
  baseUrl: string,
  resource: 'models' | 'chat/completions'
): string {
  const url = new URL(baseUrl.trim())
  const prefix = url.pathname.replace(/\/+$/, '') || '/v1'
  url.pathname = `${prefix}/${resource}`
  url.hash = ''
  return url.toString()
}

export function assertBrowserCompatibleUrl(
  baseUrl: string,
  pageProtocol = window.location.protocol
): void {
  const url = new URL(baseUrl)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ModelEndpointError('Enter a valid Base URL')
  }
  if (pageProtocol === 'https:' && url.protocol === 'http:') {
    throw new ModelEndpointError(
      'HTTPS pages cannot connect to an HTTP model endpoint'
    )
  }
}

async function readJson(response: Response, errorKey: string) {
  try {
    return (await response.json()) as unknown
  } catch {
    throw new ModelEndpointError(errorKey)
  }
}

async function readEndpointErrorDetail(
  response: Response
): Promise<string | undefined> {
  try {
    const body = (await response.json()) as unknown
    const message = getServerErrorMessage(body, '').trim()
    if (!message) return undefined
    return message.slice(0, MODEL_ENDPOINT_ERROR_DETAIL_MAX_LENGTH)
  } catch {
    return undefined
  }
}

function requestHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
}

async function checkedFetch(url: string, init: RequestInit): Promise<Response> {
  let response: Response
  try {
    response = await fetch(url, init)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }
    throw new ModelEndpointError(
      'Unable to reach the model endpoint. Check its URL and CORS policy'
    )
  }

  if (response.ok) return response
  if (response.status === 401 || response.status === 403) {
    throw new ModelEndpointError('The model endpoint rejected the API key')
  }
  if (response.status === 429) {
    throw new ModelEndpointError('The model endpoint rate limit was reached')
  }
  throw new ModelEndpointError(
    'The model endpoint request failed',
    await readEndpointErrorDetail(response)
  )
}

export async function loadOpenAIModels(
  baseUrl: string,
  apiKey: string,
  signal?: AbortSignal
): Promise<ModelOption[]> {
  assertBrowserCompatibleUrl(baseUrl)
  const response = await checkedFetch(modelEndpointUrl(baseUrl, 'models'), {
    method: 'GET',
    headers: requestHeaders(apiKey),
    signal,
  })
  const body = await readJson(
    response,
    'No models were returned by the endpoint'
  )
  const data =
    body &&
    typeof body === 'object' &&
    'data' in body &&
    Array.isArray(body.data)
      ? (body.data as Array<{ id?: unknown }>)
      : []
  const models = data
    .flatMap((item) => (typeof item.id === 'string' ? [item.id] : []))
    .sort((left, right) => left.localeCompare(right))
  if (models.length === 0) {
    throw new ModelEndpointError('No models were returned by the endpoint')
  }
  return models.map((model) => ({ label: model, value: model }))
}

export async function generateOpenAICompletion(params: {
  baseUrl: string
  apiKey: string
  model: string
  prompt: string
  signal: AbortSignal
}): Promise<string> {
  assertBrowserCompatibleUrl(params.baseUrl)
  const response = await checkedFetch(
    modelEndpointUrl(params.baseUrl, 'chat/completions'),
    {
      method: 'POST',
      headers: requestHeaders(params.apiKey),
      body: JSON.stringify({
        model: params.model,
        messages: [{ role: 'user', content: params.prompt }],
        stream: false,
      }),
      signal: params.signal,
    }
  )
  const body = await readJson(
    response,
    'The model endpoint returned an invalid chat completion'
  )
  const choices =
    body &&
    typeof body === 'object' &&
    'choices' in body &&
    Array.isArray(body.choices)
      ? (body.choices as Array<{ message?: { content?: unknown } }>)
      : []
  const content = choices[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) {
    throw new ModelEndpointError(
      'The model endpoint returned an invalid chat completion'
    )
  }
  return content
}

export function modelEvaluationWebSocketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/api/model-evaluation/ws`
}
