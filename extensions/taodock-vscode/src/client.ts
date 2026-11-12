// SPDX-License-Identifier: AGPL-3.0-only

export type FailureCode = 'http' | 'network' | 'protocol' | 'cancelled' | 'timeout';

export class TaoDockError extends Error {
  constructor(readonly code: FailureCode, readonly status?: number) {
    super(status ? `Taodock HTTP ${status}` : `Taodock ${code}`);
  }
}

export interface CatalogModel {
  id: string;
  tools: boolean;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_call_id?: string;
  tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
}

export interface ChatTool {
  name: string;
  description: string;
  inputSchema?: object;
}

export type ChatPart =
  | { type: 'text'; text: string }
  | { type: 'tool'; id: string; name: string; input: object };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// All authenticated traffic goes to the platform's fixed HTTPS origin. Redirects
// must not send credentials or conversation content to another destination.
export class TaoDockClient {
  constructor(private readonly request: typeof fetch = fetch) {}

  private async fetch(path: string, key: string | undefined, signal: AbortSignal, body?: object) {
    let response: Response;
    try {
      response = await this.request(`https://taodock.com${path}`, {
        method: body ? 'POST' : 'GET',
        headers: {
          Accept: body ? 'text/event-stream' : 'application/json',
          ...(key ? { Authorization: `Bearer ${key}` } : {}),
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal,
        redirect: 'error',
        cache: 'no-store',
        credentials: 'omit',
      });
    } catch {
      if (signal.aborted) throw new TaoDockError('cancelled');
      throw new TaoDockError('network');
    }
    if (!response.ok) {
      await response.body?.cancel();
      // Upstream error bodies may contain secrets or prompt text; never surface them.
      throw new TaoDockError('http', response.status);
    }
    return response;
  }

  async listModels(key: string, signal: AbortSignal): Promise<CatalogModel[]> {
    const response = await this.fetch('/v1/models', key, signal);
    const available: unknown = await response.json().catch(() => { throw new TaoDockError('protocol'); });
    if (!isRecord(available) || !Array.isArray(available.data)) throw new TaoDockError('protocol');

    // The public catalog describes protocols. Intersect it with the key's model
    // list so image, audio, embedding and task models never enter the chat picker.
    const catalogResponse = await this.fetch('/api/pricing', undefined, signal);
    const catalog: unknown = await catalogResponse.json().catch(() => { throw new TaoDockError('protocol'); });
    if (!isRecord(catalog) || !Array.isArray(catalog.data)) throw new TaoDockError('protocol');
    const chatModels = new Map<string, boolean>();
    for (const model of catalog.data) {
      if (!isRecord(model) || typeof model.model_name !== 'string') continue;
      if (!Array.isArray(model.supported_endpoint_types) || !model.supported_endpoint_types.includes('openai')) continue;
      chatModels.set(model.model_name, typeof model.tags === 'string' && /工具|tool/i.test(model.tags));
    }
    const models = new Map<string, CatalogModel>();
    for (const model of available.data) {
      if (!isRecord(model) || typeof model.id !== 'string' || !chatModels.has(model.id)) continue;
      models.set(model.id, { id: model.id, tools: chatModels.get(model.id) === true });
    }
    return [...models.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  async *chat(key: string, model: string, messages: ChatMessage[], tools: readonly ChatTool[], required: boolean, signal: AbortSignal): AsyncGenerator<ChatPart> {
    const response = await this.fetch('/v1/chat/completions', key, signal, {
      model,
      messages,
      stream: true,
      ...(tools.length ? {
        tools: tools.map(tool => ({ type: 'function', function: {
          name: tool.name, description: tool.description,
          parameters: tool.inputSchema ?? { type: 'object', properties: {} },
        } })),
        tool_choice: required ? 'required' : 'auto',
      } : {}),
    });
    if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) {
      await response.body?.cancel();
      throw new TaoDockError('protocol');
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const calls = new Map<number, { id: string; name: string; arguments: string }>();
    let pending = '';
    let eventData: string[] = [];
    let finished = false;
    let toolBytes = 0;
    try {
      while (!finished) {
        const { value, done } = await reader.read();
        pending += done ? decoder.decode() : decoder.decode(value, { stream: true });
        if (pending.length > 8 * 1024 * 1024) throw new TaoDockError('protocol');
        let end: number;
        while ((end = pending.indexOf('\n')) !== -1 || (done && pending.length > 0)) {
          const line = (end === -1 ? pending : pending.slice(0, end)).replace(/\r$/, '');
          pending = end === -1 ? '' : pending.slice(end + 1);
          if (line.startsWith('data:')) {
            eventData.push(line.slice(5).replace(/^ /, ''));
            if (eventData.join('').length > 8 * 1024 * 1024) throw new TaoDockError('protocol');
          }
          if (line !== '' && !(done && pending.length === 0)) continue;
          const data = eventData.join('\n');
          eventData = [];
          if (!data) continue;
          if (data === '[DONE]') { finished = true; break; }
          let payload: unknown;
          try { payload = JSON.parse(data); } catch { throw new TaoDockError('protocol'); }
          if (!isRecord(payload) || payload.error) throw new TaoDockError('protocol');
          if (!Array.isArray(payload.choices) || payload.choices.length === 0) continue;
          const choice = payload.choices[0];
          if (!isRecord(choice)) throw new TaoDockError('protocol');
          if (choice.finish_reason === 'length' || choice.finish_reason === 'content_filter') throw new TaoDockError('protocol');
          const delta = choice.delta;
          if (!isRecord(delta)) continue;
          if (typeof delta.content === 'string' && delta.content) yield { type: 'text', text: delta.content };
          if (!Array.isArray(delta.tool_calls)) continue;
          for (const part of delta.tool_calls) {
            if (!isRecord(part) || !Number.isSafeInteger(part.index) || (part.index as number) < 0) throw new TaoDockError('protocol');
            const index = part.index as number;
            const call = calls.get(index) ?? { id: '', name: '', arguments: '' };
            if (typeof part.id === 'string') { call.id += part.id; toolBytes += part.id.length; }
            if (isRecord(part.function)) {
              if (typeof part.function.name === 'string') { call.name += part.function.name; toolBytes += part.function.name.length; }
              if (typeof part.function.arguments === 'string') { call.arguments += part.function.arguments; toolBytes += part.function.arguments.length; }
            }
            if (calls.size >= 256 && !calls.has(index)) throw new TaoDockError('protocol');
            if (toolBytes > 8 * 1024 * 1024) throw new TaoDockError('protocol');
            calls.set(index, call);
          }
        }
        if (done) {
          if (!finished) throw new TaoDockError('protocol');
          break;
        }
      }
      // Validate the entire tool batch before allowing the editor to execute one.
      const parts: ChatPart[] = [];
      const ids = new Set<string>();
      for (const call of calls.values()) {
        let input: unknown;
        try { input = JSON.parse(call.arguments || '{}'); } catch { throw new TaoDockError('protocol'); }
        if (!call.id || ids.has(call.id) || !isRecord(input) || !tools.some(tool => tool.name === call.name)) throw new TaoDockError('protocol');
        ids.add(call.id);
        parts.push({ type: 'tool', id: call.id, name: call.name, input });
      }
      if (required && parts.length === 0) throw new TaoDockError('protocol');
      yield* parts;
    } catch (error) {
      if (signal.aborted) throw new TaoDockError('cancelled');
      if (error instanceof TaoDockError) throw error;
      throw new TaoDockError('network');
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  }
}
