import { readFile } from 'node:fs/promises';
import { errors } from 'playwright';

const fixtureURL = 'http://127.0.0.1/geo-fixture';
const fixtureHTML = await readFile(new URL('./fixture.html', import.meta.url), 'utf8');

export class CaptureError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

export function readCitationLinks(anchors) {
  return anchors.evaluateAll((elements) => elements.map((link) => ({
    title: link.innerText.trim(), href: link.href,
  })));
}

export function normalizeCitations(links) {
  const citations = new Map();
  for (const { title, href } of links) {
    if (!URL.canParse(href)) continue;
    const url = new URL(href);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) continue;
    if (citations.has(url.href) || Buffer.byteLength(url.href) > 2048) continue;
    citations.set(url.href, { title: title.slice(0, 256) || url.hostname, url: url.href });
    if (citations.size === 50) break;
  }
  return [...citations.values()];
}

export async function captureScreenshot(evidence, timeout) {
  let screenshot;
  try {
    screenshot = await evidence.screenshot({ type: 'png', animations: 'disabled', timeout: Math.min(10_000, timeout) });
  } catch (error) {
    throw new CaptureError('screenshot_failed');
  }
  if (screenshot.length > 4 * 1024 * 1024) throw new CaptureError('screenshot_too_large');
  return screenshot;
}

export async function captureFixture(browser, question, { html = fixtureHTML, timeoutMs = 120_000 } = {}) {
  const deadline = performance.now() + timeoutMs;
  const remaining = () => Math.max(1, deadline - performance.now());
  const context = await browser.newContext({ serviceWorkers: 'block' });
  try {
    await context.route('**/*', async (route) => {
      if (route.request().url() === fixtureURL && route.request().method() === 'GET') {
        await route.fulfill({ contentType: 'text/html; charset=utf-8', body: html });
      } else {
        await route.abort();
      }
    });

    const page = await context.newPage();
    await page.goto(fixtureURL, { timeout: remaining() });
    await page.getByRole('textbox', { name: 'Question' }).fill(question, { timeout: remaining() });
    await page.getByRole('button', { name: 'Search' }).click({ timeout: remaining() });
    await page.getByTestId('response-complete').waitFor({ timeout: remaining() });

    const answer = (await page.getByTestId('answer').innerText({ timeout: remaining() })).trim();
    if (!answer || Buffer.byteLength(answer) > 64 * 1024) throw new CaptureError('invalid_answer');

    const references = page.getByRole('button', { name: 'References' });
    let citations = [];
    if (await references.count()) {
      await references.click({ timeout: remaining() });
      const sources = page.locator('[data-testid="references"]:not([hidden])');
      await sources.waitFor({ state: 'attached', timeout: remaining() });
      citations = normalizeCitations(await readCitationLinks(sources.locator('a[href]')));
    }

    return {
      result: { platform: 'deepseek', source: 'fixture', answer, citations, captured_at: new Date().toISOString() },
      screenshot: await captureScreenshot(page.getByTestId('evidence'), remaining()),
    };
  } catch (error) {
    if (error instanceof errors.TimeoutError) throw new CaptureError('capture_timeout');
    throw error;
  } finally {
    await context.close();
  }
}
