import { once } from 'node:events';
import { createInterface } from 'node:readline/promises';
import { deepSeekURL, launchDeepSeekProfile } from './deepseek.js';

let context;
let terminal;
const shutdownSignal = new AbortController();
function shutdown() {
  shutdownSignal.abort();
  void context?.close();
}

process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
try {
  context = await launchDeepSeekProfile();
  if (!shutdownSignal.signal.aborted) {
    const closed = once(context, 'close');
    const page = context.pages()[0] ?? await context.newPage();
    await page.goto(deepSeekURL, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    terminal = createInterface({ input: process.stdin, output: process.stdout });
    await Promise.race([closed, terminal.question(
      'Sign in manually, confirm the chat page is ready, then press Enter here.\n',
      { signal: shutdownSignal.signal },
    )]);
  }
} catch {
  if (!shutdownSignal.signal.aborted) {
    console.error('Could not open the DeepSeek profile. Stop the GEO worker before signing in and check that Chromium is installed.');
    process.exitCode = 1;
  }
} finally {
  terminal?.close();
  await context?.close();
}
