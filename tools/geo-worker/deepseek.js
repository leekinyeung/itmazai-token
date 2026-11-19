import { lstat, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, errors } from 'playwright';
import { CaptureError, captureScreenshot, normalizeCitations, readCitationLinks } from './capture.js';

export const deepSeekURL = 'https://chat.deepseek.com/';
const deepSeekOrigin = new URL(deepSeekURL).origin;
const profileDirectory = process.env.GEO_DEEPSEEK_PROFILE_DIR || fileURLToPath(new URL('./.profiles/deepseek', import.meta.url));
const stopCodes = ['login_required', 'human_challenge', 'rate_limited', 'access_denied'];

export async function launchDeepSeekProfile(directory = profileDirectory, { headless = false } = {}) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const info = await lstat(directory);
  if (!info.isDirectory() || (process.platform !== 'win32' && (info.mode & 0o077))) {
    throw new Error('DeepSeek profile must be a private directory');
  }

  return chromium.launchPersistentContext(directory, { channel: 'chromium', headless, acceptDownloads: false });
}

export function createDeepSeekCollector(context, { timeoutMs = 120_000, quietMs = 4000 } = {}) {
  let blocked;
  return async (question) => {
    if (blocked) throw new CaptureError(blocked);
    try {
      return await captureDeepSeek(context, question, timeoutMs, quietMs);
    } catch (error) {
      // Resume only after an operator has checked the account or platform limit.
      if (error instanceof CaptureError && stopCodes.includes(error.code)) blocked = error.code;
      throw error;
    }
  };
}

async function captureDeepSeek(context, question, timeoutMs, quietMs) {
  const deadline = performance.now() + timeoutMs;
  const remaining = () => Math.max(1, deadline - performance.now());
  const page = await context.newPage();
  try {
    const navigation = await page.goto(deepSeekURL, { waitUntil: 'domcontentloaded', timeout: remaining() });
    if (navigation?.status() === 401) throw new CaptureError('login_required');
    if (navigation?.status() === 403) throw new CaptureError('access_denied');
    if (navigation?.status() === 429) throw new CaptureError('rate_limited');

    const composer = page.locator('textarea#chat-input, textarea[placeholder*="DeepSeek" i]').filter({ visible: true }).first();
    const challenge = page.locator('.ds-shumei-captcha-modal, iframe[src*="captcha" i], iframe[title*="captcha" i]')
      .filter({ visible: true }).first();
    const login = page.locator('input[type="password"], input[autocomplete="one-time-code"], input[type="tel"]')
      .or(page.getByRole('button', { name: /^(登录|手机号登录|log in|sign in)$/i }))
      .filter({ visible: true }).first();
    const limit = page.locator('[role="alert"], .ds-toast')
      .filter({ hasText: /操作频繁|达到上限|请求过多|账号受限|too many requests|rate limit|account restricted/i, visible: true }).first();

    async function checkSession() {
      const current = new URL(page.url());
      if (await challenge.isVisible()) throw new CaptureError('human_challenge');
      if (await limit.isVisible()) throw new CaptureError('rate_limited');
      if (/\/(login|sign[-_]?in|passport|auth)(\/|$)/i.test(current.pathname) || await login.isVisible()) {
        throw new CaptureError('login_required');
      }
      if (current.origin !== deepSeekOrigin) throw new CaptureError('unexpected_navigation');
    }

    await checkSession();
    await composer.or(challenge).or(login).or(limit).first().waitFor({ timeout: remaining() });
    await checkSession();

    const explicitSearch = await enableSearch(page, remaining());
    await checkSession();

    const answers = page.locator('.ds-markdown').filter({ visible: true });
    const previousCount = await answers.count();
    const generating = page.getByRole('button', { name: /^(停止生成|停止响应|stop generating|stop responding)$/i })
      .filter({ visible: true }).first();
    const send = page.getByRole('button', { name: /^(发送|send|send message)$/i }).filter({ visible: true }).first();
    // Some page layouts expose search through the prompt instead of a toggle.
    const input = explicitSearch ? question : `${question}\n\n请先联网检索公开资料，并附上可核对的引用来源。`;
    await composer.fill(input, { timeout: remaining() });
    if (await send.isVisible()) await send.click({ timeout: remaining() });
    else await composer.press('Enter', { timeout: remaining() });

    let lastText = '';
    let lastChange = performance.now();
    while (performance.now() < deadline) {
      await checkSession();
      if (await answers.count() > previousCount) {
        const answer = answers.last();
        const text = (await answer.innerText({ timeout: remaining() })).trim();
        const busy = await generating.isVisible();
        if (text !== lastText || busy) {
          lastText = text;
          lastChange = performance.now();
        } else if (text && performance.now() - lastChange >= quietMs) {
          if (Buffer.byteLength(text) > 64 * 1024) throw new CaptureError('invalid_answer');
          const screenshot = await captureScreenshot(answer, remaining());
          const citations = await collectDeepSeekCitations(page, answer, remaining(), checkSession);
          await checkSession();
          if (!explicitSearch && !citations.length) throw new CaptureError('citations_unavailable');
          return {
            result: { platform: 'deepseek', source: 'deepseek_web', answer: text, citations, captured_at: new Date().toISOString() },
            screenshot,
          };
        }
      }
      await delay(Math.min(250, remaining()));
    }
    throw new CaptureError('capture_timeout');
  } catch (error) {
    if (error instanceof errors.TimeoutError) throw new CaptureError('capture_timeout');
    throw error;
  } finally {
    await page.close();
  }
}

async function enableSearch(page, timeout) {
  const label = /^(搜索|联网|联网搜索|网页搜索|智能搜索|search|web search|internet search|search the web|smart search)$/i;
  const toggle = page.getByRole('button', { name: label })
    .or(page.locator('.ds-toggle-button').filter({ hasText: label }))
    .filter({ visible: true }).first();
  const deadline = performance.now() + Math.min(timeout, 3000);
  const remaining = () => Math.max(1, deadline - performance.now());
  try {
    await toggle.waitFor({ timeout: remaining() });
    const state = await searchEnabled(toggle, remaining());
    if (state !== false) return state === true;
    await toggle.click({ timeout: remaining() });
    while (performance.now() < deadline) {
      if (await searchEnabled(toggle, remaining())) return true;
      await delay(Math.min(100, remaining()));
    }
    return false;
  } catch (error) {
    if (error instanceof errors.TimeoutError) return false;
    throw error;
  }
}

function searchEnabled(toggle, timeout) {
  return toggle.evaluate((element) => {
    const pressed = element.getAttribute('aria-pressed') ?? element.getAttribute('aria-checked');
    if (pressed === 'true' || pressed === 'false') return pressed === 'true';
    const state = element.getAttribute('data-state');
    if (state === 'on' || state === 'off') return state === 'on';
    if (element.matches('.ds-toggle-button--selected, .ds-toggle-button--active')
        || element.querySelector('.ds-toggle-button--selected, .ds-toggle-button--active')) return true;
    return null;
  }, undefined, { timeout });
}

async function collectDeepSeekCitations(page, answer, timeout, checkSession) {
  const inlineLinks = await readCitationLinks(answer.locator('a.ds-markdown-cite[href], a:has(.ds-markdown-cite), .ds-markdown-cite a[href]'));
  const sources = page.getByText(/^(?:(?:已?搜索到|找到|found)\s*)?\d+\s*(?:个网页|条来源|sources?|web pages?)$/i)
    .filter({ visible: true }).last();
  if (!await sources.isVisible()) return normalizeCitations(inlineLinks);
  const label = await sources.innerText({ timeout });
  const expected = Math.min(50, Number(label.match(/\d+/)?.[0] ?? 0));
  if (!expected) return normalizeCitations(inlineLinks);

  // The panel varies by locale. Keep links revealed by this task's sources control.
  const anchors = page.locator('a[href]').filter({ visible: true });
  const before = new Set((await readCitationLinks(anchors)).map(({ href }) => href));
  const deadline = performance.now() + Math.min(8000, timeout);
  await sources.click({ timeout: Math.max(1, deadline - performance.now()) });

  let citations = normalizeCitations(inlineLinks);
  while (performance.now() < deadline) {
    await checkSession();
    const panelLinks = (await readCitationLinks(anchors)).filter(({ href }) => !before.has(href) && !href.startsWith(deepSeekOrigin + '/'));
    citations = normalizeCitations([...panelLinks, ...inlineLinks]);
    if (citations.length >= expected) break;
    await delay(Math.max(1, Math.min(200, deadline - performance.now())));
  }
  if (!citations.length) throw new CaptureError('citations_unavailable');
  return citations;
}
