// SPDX-License-Identifier: AGPL-3.0-only
import * as vscode from 'vscode';
import { TaoDockClient, TaoDockError, type ChatMessage } from './client';

const SECRET_KEY = 'taodock.apiKey';

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.cause instanceof TaoDockError) error = error.cause;
  if (!(error instanceof TaoDockError)) return vscode.l10n.t('Taodock could not complete the request. Please try again.');
  if (error.status === 401) return vscode.l10n.t('Your Taodock API key is invalid, expired or disabled. Set a valid key and try again.');
  if (error.status === 402 || error.status === 403) return vscode.l10n.t('Taodock denied this request. Check your balance, key quota and model access in the console.');
  if (error.status === 429) return vscode.l10n.t('Taodock rate limit reached. Please wait before trying again.');
  if (error.code === 'protocol') return vscode.l10n.t('Taodock returned an incomplete or unsupported response. Check model compatibility and request logs.');
  if (error.code === 'timeout') return vscode.l10n.t('The Taodock request timed out. Check request logs before retrying.');
  return vscode.l10n.t('Could not connect to Taodock. Check your network and try again.');
}

export function toOpenAIMessages(messages: readonly vscode.LanguageModelChatRequestMessage[]): ChatMessage[] {
  const result: ChatMessage[] = [];
  for (const message of messages) {
    const role = message.role === vscode.LanguageModelChatMessageRole.Assistant ? 'assistant' : 'user';
    let content = '';
    const calls: NonNullable<ChatMessage['tool_calls']> = [];
    const results: ChatMessage[] = [];
    for (const part of message.content) {
      if (part instanceof vscode.LanguageModelTextPart) content += part.value;
      else if (part instanceof vscode.LanguageModelToolCallPart && role === 'assistant') {
        calls.push({ id: part.callId, type: 'function', function: { name: part.name, arguments: JSON.stringify(part.input) } });
      } else if (part instanceof vscode.LanguageModelToolResultPart && role === 'user') {
        const text: string[] = [];
        for (const item of part.content) {
          if (!(item instanceof vscode.LanguageModelTextPart)) throw new TaoDockError('protocol');
          text.push(item.value);
        }
        results.push({ role: 'tool', tool_call_id: part.callId, content: text.join('\n') });
      } else throw new TaoDockError('protocol');
    }
    // OpenAI requires tool results immediately after the assistant's calls, even
    // when the editor combines tool results and user text into one user message.
    result.push(...results);
    if (content || calls.length || results.length === 0) {
      result.push({ role, content: content || null, ...(calls.length ? { tool_calls: calls } : {}) });
    }
  }
  return result;
}

export class TaoDockProvider implements vscode.LanguageModelChatProvider, vscode.Disposable {
  private readonly changed = new vscode.EventEmitter<void>();
  readonly onDidChangeLanguageModelChatInformation = this.changed.event;
  private readonly requests = new Set<AbortController>();
  private managing: Promise<void> | undefined;

  constructor(
    private readonly secrets: vscode.SecretStorage,
    private readonly log: vscode.LogOutputChannel,
    private readonly client = new TaoDockClient(),
  ) {}

  invalidate(): void {
    for (const controller of this.requests) controller.abort();
    this.changed.fire();
  }

  dispose(): void {
    this.invalidate();
    this.changed.dispose();
  }

  private async request<T>(token: vscode.CancellationToken | undefined, action: (signal: AbortSignal) => Promise<T>, timeout = 60_000): Promise<T> {
    const controller = new AbortController();
    const subscription = token?.onCancellationRequested(() => controller.abort());
    if (token?.isCancellationRequested) controller.abort();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeout);
    this.requests.add(controller);
    try {
      if (controller.signal.aborted) throw new TaoDockError('cancelled');
      return await action(controller.signal);
    } catch (error) {
      if (timedOut) throw new TaoDockError('timeout');
      throw error;
    } finally {
      clearTimeout(timer);
      subscription?.dispose();
      this.requests.delete(controller);
    }
  }

  manage(): Promise<void> {
    // Model discovery and the command can both request setup concurrently.
    this.managing ??= this.enterKey().finally(() => { this.managing = undefined; });
    return this.managing;
  }

  private async enterKey(): Promise<void> {
    const input = await vscode.window.showInputBox({
      title: vscode.l10n.t('Connect Taodock'),
      prompt: vscode.l10n.t('Paste an API key from taodock.com/keys. It will be stored in VS Code Secret Storage.'),
      password: true,
      ignoreFocusOut: true,
      validateInput: value => !value.trim() || /[\s\x00-\x1f\x7f]/.test(value.trim()) || value.trim().length > 4096
        ? vscode.l10n.t('Enter a complete API key without spaces or line breaks.') : undefined,
    });
    if (input === undefined) return;
    const key = input.trim();
    if (!key || /[\s\x00-\x1f\x7f]/.test(key) || key.length > 4096) throw new TaoDockError('protocol');
    try {
      const models = await this.request(undefined, signal => this.client.listModels(key, signal));
      if (models.length === 0) {
        await vscode.window.showWarningMessage(vscode.l10n.t('This key has no supported chat models. Check its group and model permissions in Taodock.'));
        return;
      }
      await this.secrets.store(SECRET_KEY, key);
      this.invalidate();
      this.log.info('API key validated and saved; existing requests cancelled.');
      await vscode.window.showInformationMessage(vscode.l10n.t('Taodock connected. Choose a Taodock model in the chat model picker.'));
    } catch (error) {
      this.log.warn(error instanceof TaoDockError ? error.message : 'Key setup failed.');
      throw error;
    }
  }

  async removeKey(): Promise<void> {
    await this.secrets.delete(SECRET_KEY);
    this.invalidate();
    this.log.info('Local API key removed; existing requests cancelled.');
    await vscode.window.showInformationMessage(vscode.l10n.t('Taodock API key removed from this editor. Revoke it in the console to disable it everywhere.'));
  }

  async refreshModels(): Promise<void> {
    this.changed.fire();
    const source = new vscode.CancellationTokenSource();
    try {
      await this.provideLanguageModelChatInformation({ silent: false }, source.token);
    } finally {
      source.dispose();
    }
    await vscode.window.showInformationMessage(vscode.l10n.t('Taodock models refreshed. Open the chat model picker to choose a model.'));
  }

  async provideLanguageModelChatInformation(options: vscode.PrepareLanguageModelChatModelOptions, token: vscode.CancellationToken): Promise<vscode.LanguageModelChatInformation[]> {
    let key = await this.secrets.get(SECRET_KEY);
    if (!key && !options.silent && !token.isCancellationRequested) {
      await this.manage();
      key = await this.secrets.get(SECRET_KEY);
    }
    if (!key || token.isCancellationRequested) return [];
    try {
      const models = await this.request(token, signal => this.client.listModels(key, signal));
      return models.map(model => ({
        id: model.id, name: model.id, family: model.id, version: '1',
        detail: 'Taodock',
        tooltip: vscode.l10n.t('Provided by Taodock. Availability and charges follow your account and key permissions.'),
        // /v1/models does not expose context limits. Use a conservative editor
        // budget rather than advertise unverified model limits.
        maxInputTokens: 28_672, maxOutputTokens: 4096,
        capabilities: { imageInput: false, toolCalling: model.tools },
      }));
    } catch (error) {
      if (error instanceof TaoDockError && error.code === 'cancelled') return [];
      this.log.warn(error instanceof TaoDockError ? error.message : 'Model discovery failed.');
      throw new Error(errorMessage(error), { cause: error });
    }
  }

  async provideLanguageModelChatResponse(
    model: vscode.LanguageModelChatInformation,
    messages: readonly vscode.LanguageModelChatRequestMessage[],
    options: vscode.ProvideLanguageModelChatResponseOptions,
    progress: vscode.Progress<vscode.LanguageModelResponsePart>,
    token: vscode.CancellationToken,
  ): Promise<void> {
    const key = await this.secrets.get(SECRET_KEY);
    if (!key) throw new Error(vscode.l10n.t('Set your Taodock API key before sending a message.'));
    if (token.isCancellationRequested) throw new vscode.CancellationError();
    try {
      await this.request(token, async signal => {
        const tools = options.tools ?? [];
        if (tools.length && !model.capabilities.toolCalling) throw new TaoDockError('protocol');
        if (options.toolMode === vscode.LanguageModelChatToolMode.Required && tools.length === 0) throw new TaoDockError('protocol');
        for await (const part of this.client.chat(key, model.id, toOpenAIMessages(messages), tools,
          options.toolMode === vscode.LanguageModelChatToolMode.Required, signal)) {
          if (signal.aborted) throw new TaoDockError('cancelled');
          progress.report(part.type === 'text'
            ? new vscode.LanguageModelTextPart(part.text)
            : new vscode.LanguageModelToolCallPart(part.id, part.name, part.input));
        }
      }, 600_000);
    } catch (error) {
      if (error instanceof TaoDockError && error.code === 'cancelled') throw new vscode.CancellationError();
      this.log.warn(error instanceof TaoDockError ? error.message : 'Chat request failed.');
      throw new Error(errorMessage(error));
    }
  }

  async provideTokenCount(_model: vscode.LanguageModelChatInformation, text: string | vscode.LanguageModelChatRequestMessage, token: vscode.CancellationToken): Promise<number> {
    if (token.isCancellationRequested) throw new vscode.CancellationError();
    // Byte-based upper estimate for editor context budgeting across tokenizers.
    // It never represents billable usage; settlement remains on the server.
    return Buffer.byteLength(typeof text === 'string' ? text : JSON.stringify(toOpenAIMessages([text])), 'utf8') + 16;
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const log = vscode.window.createOutputChannel('Taodock', { log: true });
  const provider = new TaoDockProvider(context.secrets, log);
  context.subscriptions.push(log, provider,
    vscode.lm.registerLanguageModelChatProvider('taodock', provider),
    context.secrets.onDidChange(event => { if (event.key === SECRET_KEY) provider.invalidate(); }),
  );
  const commands: Record<string, () => unknown> = {
    'taodock.manage': () => provider.manage(),
    'taodock.refreshModels': () => provider.refreshModels(),
    'taodock.removeKey': () => provider.removeKey(),
    'taodock.openConsole': () => vscode.env.openExternal(vscode.Uri.parse('https://taodock.com/keys')),
    'taodock.openDocs': () => vscode.env.openExternal(vscode.Uri.parse('https://docs.taodock.com')),
  };
  for (const [command, action] of Object.entries(commands)) {
    context.subscriptions.push(vscode.commands.registerCommand(command, async () => {
      try { await action(); }
      catch (error) { await vscode.window.showErrorMessage(errorMessage(error)); }
    }));
  }
}
