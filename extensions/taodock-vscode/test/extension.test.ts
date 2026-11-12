import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { TaoDockClient, TaoDockError, type ChatPart } from '../src/client';
import type * as VSCode from 'vscode';

class TextPart { constructor(public value: string) {} }
class ToolCall { constructor(public callId: string, public name: string, public input: object) {} }
class ToolResult { constructor(public callId: string, public content: unknown[]) {} }
class CancellationError extends Error {}
class Emitter<T> {
  private listeners = new Set<(value: T) => void>();
  event = (listener: (value: T) => void) => {
    this.listeners.add(listener);
    return { dispose: () => { this.listeners.delete(listener); } };
  };
  fire(value: T) { for (const listener of this.listeners) listener(value); }
  dispose() { this.listeners.clear(); }
}

let input: string | undefined;
const prompts: object[] = [];
const notices: string[] = [];
const logs: string[] = [];
const registered = new Map<string, () => unknown>();
let registeredVendor = '';
mock.module('vscode', () => ({
  LanguageModelTextPart: TextPart, LanguageModelToolCallPart: ToolCall, LanguageModelToolResultPart: ToolResult,
  LanguageModelChatMessageRole: { User: 1, Assistant: 2 },
  LanguageModelChatToolMode: { Auto: 1, Required: 2 },
  CancellationError, EventEmitter: Emitter,
  l10n: { t: (message: string) => message },
  window: {
    showInputBox: async (options: object) => { prompts.push(options); return input; },
    showInformationMessage: async (message: string) => { notices.push(message); },
    showWarningMessage: async (message: string) => { notices.push(message); },
    showErrorMessage: async (message: string) => { notices.push(message); },
    createOutputChannel: () => ({ info: (message: string) => logs.push(message), warn: (message: string) => logs.push(message), dispose() {} }),
  },
  commands: { registerCommand: (name: string, callback: () => unknown) => { registered.set(name, callback); return { dispose() {} }; } },
  lm: { registerLanguageModelChatProvider: (vendor: string) => { registeredVendor = vendor; return { dispose() {} }; } },
}));
const { TaoDockProvider, toOpenAIMessages, activate } = await import('../src/extension');

const signal = () => new AbortController().signal;
const token = (controller = new AbortController()): VSCode.CancellationToken => ({
  get isCancellationRequested() { return controller.signal.aborted; },
  onCancellationRequested: listener => {
    const handler = () => listener(undefined);
    controller.signal.addEventListener('abort', handler);
    return { dispose: () => controller.signal.removeEventListener('abort', handler) };
  },
});
const model: VSCode.LanguageModelChatInformation = {
  id: 'chat-model', name: 'chat-model', family: 'chat-model', version: '1',
  maxInputTokens: 28672, maxOutputTokens: 4096, capabilities: { toolCalling: true },
};
const user = (content: unknown[]): VSCode.LanguageModelChatRequestMessage => ({ role: 1, name: undefined, content });
const json = (value: unknown) => Response.json(value);
const tool = { name: 'read_file', description: 'Read a file', inputSchema: { type: 'object' } };
const sse = (payloads: unknown[], done = true) => payloads.map(value => `data: ${JSON.stringify(value)}\r\n\r\n`).join('') + (done ? 'data: [DONE]\r\n\r\n' : '');
const streaming = (text: string, chunkLength = 7) => {
  const bytes = new TextEncoder().encode(text);
  return new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      for (let start = 0; start < bytes.length; start += chunkLength) controller.enqueue(bytes.slice(start, start + chunkLength));
      controller.close();
    },
  }), { headers: { 'content-type': 'text/event-stream; charset=utf-8' } });
};
async function collect(parts: AsyncIterable<ChatPart>) { const result: ChatPart[] = []; for await (const part of parts) result.push(part); return result; }

function fixture(request: (url: string, options: RequestInit) => Promise<Response>, initialKey?: string) {
  const values = new Map(initialKey ? [['taodock.apiKey', initialKey]] : []);
  const changed = new Emitter<VSCode.SecretStorageChangeEvent>();
  const secrets = {
    get: async (name: string) => values.get(name),
    store: async (name: string, value: string) => { values.set(name, value); changed.fire({ key: name }); },
    delete: async (name: string) => { values.delete(name); changed.fire({ key: name }); },
    onDidChange: changed.event,
  };
  const log = { info: (message: string) => logs.push(message), warn: (message: string) => logs.push(message) };
  const client = new TaoDockClient(((url: string, options: RequestInit) => request(url, options)) as unknown as typeof fetch);
  const provider = new TaoDockProvider(secrets, log as unknown as VSCode.LogOutputChannel, client);
  return { client, provider, values, secrets };
}

beforeEach(() => { input = undefined; prompts.length = 0; notices.length = 0; logs.length = 0; registered.clear(); });
afterEach(() => mock.restore());

describe('model access and credential handling', () => {
  test('intersects key permissions and chat protocols, excludes media and deduplicates', async () => {
    const requests: Array<{ url: string; options: RequestInit }> = [];
    const { client } = fixture(async (url, options) => {
      requests.push({ url, options });
      return url.endsWith('/v1/models')
        ? json({ data: [{ id: 'chat-model' }, { id: 'image-model' }, { id: 'chat-model' }, { id: 'unknown' }] })
        : json({ data: [
          { model_name: 'chat-model', supported_endpoint_types: ['openai'], tags: '推理,工具' },
          { model_name: 'image-model', supported_endpoint_types: ['image-generation'] },
          { model_name: 'other-account-model', supported_endpoint_types: ['openai'] },
        ] });
    });
    expect(await client.listModels('test-key', signal())).toEqual([{ id: 'chat-model', tools: true }]);
    expect(requests.map(request => request.url)).toEqual(['https://taodock.com/v1/models', 'https://taodock.com/api/pricing']);
    expect(requests[0]?.options.headers).toMatchObject({ Authorization: 'Bearer test-key' });
    expect(requests[1]?.options.headers).not.toHaveProperty('Authorization');
    for (const request of requests) {
      expect(request.options).toMatchObject({ redirect: 'error', cache: 'no-store', credentials: 'omit' });
      expect(request.url).not.toContain('test-key');
    }
  });

  test('silent discovery does not prompt or fetch without a key', async () => {
    const request = mock(async () => json({}));
    const { provider } = fixture(request);
    expect(await provider.provideLanguageModelChatInformation({ silent: true }, token())).toEqual([]);
    expect(prompts).toHaveLength(0);
    expect(request).not.toHaveBeenCalled();
    provider.dispose();
  });

  test('validates a new key before saving it and uses a masked prompt', async () => {
    input = 'new-test-key';
    const { provider, values } = fixture(async url => url.endsWith('/v1/models')
      ? json({ data: [{ id: 'chat-model' }] })
      : json({ data: [{ model_name: 'chat-model', supported_endpoint_types: ['openai'] }] }), 'old-test-key');
    await provider.manage();
    expect(values.get('taodock.apiKey')).toBe('new-test-key');
    expect(prompts[0]).toMatchObject({ password: true });
    expect(prompts[0]).not.toHaveProperty('value');
    expect(logs.join('\n')).not.toContain('new-test-key');
    provider.dispose();
  });

  test.each([401, 403, 429])('failed key validation preserves the previous key (HTTP %i)', async status => {
    input = 'bad-test-key';
    const { provider, values } = fixture(async () => new Response('bad-test-key private-provider-detail', { status }), 'old-test-key');
    await expect(provider.manage()).rejects.toMatchObject({ status });
    expect(values.get('taodock.apiKey')).toBe('old-test-key');
    expect(logs.join('\n')).not.toContain('bad-test-key');
    expect(logs.join('\n')).not.toContain('private-provider-detail');
    provider.dispose();
  });

  test('cancelled setup and keys with no compatible models do not replace existing credentials', async () => {
    const request = mock(async () => json({ data: [] }));
    const { provider, values } = fixture(request, 'old-test-key');
    await provider.manage();
    expect(request).not.toHaveBeenCalled();
    input = 'new-test-key';
    await provider.manage();
    expect(values.get('taodock.apiKey')).toBe('old-test-key');
    expect(notices.join('')).toContain('no supported chat models');
    provider.dispose();
  });

  test('invalid input never reaches the network', async () => {
    input = 'key\r\nInjected: header';
    const request = mock(async () => json({}));
    const { provider } = fixture(request);
    await expect(provider.manage()).rejects.toMatchObject({ code: 'protocol' });
    expect(request).not.toHaveBeenCalled();
    provider.dispose();
  });
});

describe('chat protocol', () => {
  test('preserves assistant tool calls and puts all tool results before new user text', () => {
    expect(toOpenAIMessages([
      { role: 2, name: undefined, content: [new TextPart('Checking'), new ToolCall('one', 'read_file', { path: 'a' }), new ToolCall('two', 'read_file', { path: 'b' })] },
      user([new TextPart('Continue'), new ToolResult('one', [new TextPart('A')]), new ToolResult('two', [new TextPart('B')])]),
    ])).toEqual([
      { role: 'assistant', content: 'Checking', tool_calls: [
        { id: 'one', type: 'function', function: { name: 'read_file', arguments: '{"path":"a"}' } },
        { id: 'two', type: 'function', function: { name: 'read_file', arguments: '{"path":"b"}' } },
      ] },
      { role: 'tool', tool_call_id: 'one', content: 'A' },
      { role: 'tool', tool_call_id: 'two', content: 'B' },
      { role: 'user', content: 'Continue' },
    ]);
  });

  test('rejects unsupported parts rather than silently dropping context', () => {
    expect(() => toOpenAIMessages([user([{ mimeType: 'image/png', data: new Uint8Array() }])])).toThrow(TaoDockError);
    expect(() => toOpenAIMessages([user([new ToolResult('one', [{ value: 'hidden binary' }])])])).toThrow(TaoDockError);
  });

  test('streams split UTF-8 SSE and assembles interleaved tool calls', async () => {
    let sent: Record<string, unknown> = {};
    const { client } = fixture(async (_url, options) => {
      sent = JSON.parse(options.body as string);
      return streaming(sse([
        { choices: [{ delta: { content: '你好 🌏' } }] },
        { choices: [{ delta: { tool_calls: [
          { index: 0, id: 'one', function: { name: 'read_file', arguments: '{"path":' } },
          { index: 1, id: 'two', function: { name: 'read_file', arguments: '{"path":' } },
        ] } }] },
        { choices: [{ delta: { tool_calls: [
          { index: 1, function: { arguments: '"b"}' } }, { index: 0, function: { arguments: '"a"}' } },
        ] } }] },
        { choices: [{ delta: {}, finish_reason: 'tool_calls' }] },
      ]), 1);
    });
    expect(await collect(client.chat('test-key', 'chat-model', [], [tool], true, signal()))).toEqual([
      { type: 'text', text: '你好 🌏' },
      { type: 'tool', id: 'one', name: 'read_file', input: { path: 'a' } },
      { type: 'tool', id: 'two', name: 'read_file', input: { path: 'b' } },
    ]);
    expect(sent).toMatchObject({ model: 'chat-model', stream: true, tool_choice: 'required' });
    expect(sent).not.toHaveProperty('max_tokens');
    expect(sent).not.toHaveProperty('max_completion_tokens');
  });

  test.each([
    { name: 'truncated stream', text: sse([{ choices: [{ delta: { tool_calls: [{ index: 0, id: 'one', function: { name: 'read_file', arguments: '{}' } }] } }] }], false) },
    { name: 'malformed tool JSON', text: sse([{ choices: [{ delta: { tool_calls: [{ index: 0, id: 'one', function: { name: 'read_file', arguments: '{' } }] } }] }]) },
    { name: 'undeclared tool', text: sse([{ choices: [{ delta: { tool_calls: [{ index: 0, id: 'one', function: { name: 'run_shell', arguments: '{}' } }] } }] }]) },
    { name: 'duplicate tool ID', text: sse([{ choices: [{ delta: { tool_calls: [
      { index: 0, id: 'one', function: { name: 'read_file', arguments: '{}' } }, { index: 1, id: 'one', function: { name: 'read_file', arguments: '{}' } },
    ] } }] }]) },
    { name: 'in-stream error', text: sse([{ error: { message: 'sensitive-content' } }]) },
    { name: 'invalid event JSON', text: 'data: broken\n\ndata: [DONE]\n\n' },
  ])('does not execute tools on $name', async ({ text }) => {
    const { client } = fixture(async () => streaming(text));
    const parts: ChatPart[] = [];
    await expect((async () => { for await (const part of client.chat('test-key', 'chat-model', [], [tool], false, signal())) parts.push(part); })()).rejects.toMatchObject({ code: 'protocol' });
    expect(parts.filter(part => part.type === 'tool')).toHaveLength(0);
  });

  test('HTTP error bodies never reach errors or logs and generation is never retried', async () => {
    const request = mock(async () => new Response('test-secret private-prompt', { status: 401 }));
    const { provider } = fixture(request, 'test-secret');
    await expect(provider.provideLanguageModelChatResponse(model, [user([new TextPart('private-prompt')])], { toolMode: 1 }, { report() {} }, token())).rejects.toThrow('invalid, expired or disabled');
    expect(request).toHaveBeenCalledTimes(1);
    expect(logs.join('')).not.toContain('test-secret');
    expect(logs.join('')).not.toContain('private-prompt');
    provider.dispose();
  });

  test('pre-cancelled requests do not send credentials', async () => {
    const request = mock(async () => json({}));
    const { provider } = fixture(request, 'test-key');
    const controller = new AbortController(); controller.abort();
    await expect(provider.provideLanguageModelChatResponse(model, [], { toolMode: 1 }, { report() {} }, token(controller))).rejects.toBeInstanceOf(CancellationError);
    expect(request).not.toHaveBeenCalled();
    provider.dispose();
  });

  test('removing a key aborts active requests and prevents subsequent use', async () => {
    let started!: () => void;
    const ready = new Promise<void>(resolve => { started = resolve; });
    let activeSignal: AbortSignal | undefined;
    const { provider, values } = fixture(async (_url, options) => {
      activeSignal = options.signal as AbortSignal;
      started();
      return new Promise((_resolve, reject) => activeSignal!.addEventListener('abort', () => reject(new Error('aborted'))));
    }, 'test-key');
    const request = provider.provideLanguageModelChatResponse(model, [], { toolMode: 1 }, { report() {} }, token()).catch(error => error);
    await ready;
    await provider.removeKey();
    expect(await request).toBeInstanceOf(CancellationError);
    expect(activeSignal?.aborted).toBe(true);
    expect(values.has('taodock.apiKey')).toBe(false);
    await expect(provider.provideLanguageModelChatResponse(model, [], { toolMode: 1 }, { report() {} }, token())).rejects.toThrow('Set your Taodock API key');
    provider.dispose();
  });

  test('token budgeting includes tool arguments and does not contact the billing service', async () => {
    const request = mock(async () => json({}));
    const { provider } = fixture(request);
    const count = await provider.provideTokenCount(model, { role: 2, name: undefined, content: [new ToolCall('one', 'read_file', { path: '测试' })] }, token());
    expect(count).toBeGreaterThan(Buffer.byteLength('测试'));
    expect(request).not.toHaveBeenCalled();
    provider.dispose();
  });
});

test('activation registers the native provider and every manifest command', async () => {
  const { secrets } = fixture(async () => json({}));
  const context = { secrets, subscriptions: [] as VSCode.Disposable[] };
  activate(context as unknown as VSCode.ExtensionContext);
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  expect(registeredVendor).toBe('taodock');
  expect([...registered.keys()].sort()).toEqual(manifest.contributes.commands.map((command: { command: string }) => command.command).sort());
  for (const subscription of context.subscriptions) subscription.dispose();
});

test('all seven interface languages have every manifest and runtime translation', async () => {
  const source = await readFile(new URL('../src/extension.ts', import.meta.url), 'utf8');
  const keys = [...source.matchAll(/vscode\.l10n\.t\('([^']+)'\)/g)].map(match => match[1]!);
  const base = JSON.parse(await readFile(new URL('../package.nls.json', import.meta.url), 'utf8'));
  for (const locale of ['zh-cn', 'zh-tw', 'fr', 'ja', 'ru', 'vi']) {
    const manifest = JSON.parse(await readFile(new URL(`../package.nls.${locale}.json`, import.meta.url), 'utf8'));
    const bundle = JSON.parse(await readFile(new URL(`../l10n/bundle.l10n.${locale}.json`, import.meta.url), 'utf8'));
    expect(Object.keys(manifest).sort()).toEqual(Object.keys(base).sort());
    for (const key of keys) expect(typeof bundle[key]).toBe('string');
  }
});
