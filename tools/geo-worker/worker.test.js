import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { captureFixture } from './capture.js';
import { createDeepSeekCollector, deepSeekURL, launchDeepSeekProfile } from './deepseek.js';
import { parseTaskResult } from './plugin.js';
import { createGeoServer } from './server.js';

const fixture = await readFile(new URL('./fixture.html', import.meta.url), 'utf8');
const expectedCitations = [
  { title: '网关公开资料（模拟）', url: 'https://example.com/gateway' },
  { title: '模型公开资料（模拟）', url: 'https://example.org/models' },
];

test('captures answers, page citations and PNG, including pages with no references', { timeout: 15_000 }, async (t) => {
  const browser = await chromium.launch({ channel: 'chromium' });
  t.after(() => browser.close());
  const question = '哪些网关支持多模型？';
  const { result, screenshot } = await captureFixture(browser, question);
  assert.equal(result.source, 'fixture');
  assert.equal(result.answer, `本地模拟回答。收到的问题：${question} 已从模拟页面提取回答和引用。`);
  assert.deepEqual(result.citations, expectedCitations);

  const decoder = await browser.newPage();
  const width = await decoder.evaluate(async (base64) => {
    const encoded = await fetch(`data:image/png;base64,${base64}`);
    return (await createImageBitmap(await encoded.blob())).width;
  }, screenshot.toString('base64'));
  assert.ok(width > 0);
  await decoder.close();

  const noReferences = fixture.replace(/<button type="button"[^>]*>References<\/button>/, '');
  const unreferenced = await captureFixture(browser, question, { html: noReferences });
  assert.deepEqual(unreferenced.result.citations, []);

  const emptyReferences = fixture.replace(/<li>[^\n]+<\/li>/g, '');
  const empty = await captureFixture(browser, question, { html: emptyReferences });
  assert.deepEqual(empty.result.citations, []);
});

test('reports a generation timeout and missing screenshot target', { timeout: 20_000 }, async (t) => {
  const browser = await chromium.launch({ channel: 'chromium' });
  t.after(() => browser.close());
  const unfinished = fixture.replace(/document\.querySelector\('\[data-testid="response-complete"\]'\)\.hidden = false;/, '');
  await assert.rejects(captureFixture(browser, 'test', { html: unfinished, timeoutMs: 1500 }), { code: 'capture_timeout' });

  const missingScreenshot = fixture.replace('data-testid="evidence"', 'data-testid="other"');
  await assert.rejects(captureFixture(browser, 'test', { html: missingScreenshot, timeoutMs: 8000 }), { code: 'screenshot_failed' });
});

test('authorizes each worker route and deduplicates submission retries', { timeout: 15_000 }, async (t) => {
  const browser = await chromium.launch({ channel: 'chromium' });
  const token = randomBytes(32).toString('base64url');
  const started = Promise.withResolvers();
  const release = Promise.withResolvers();
  const completed = Promise.withResolvers();
  let captures = 0;
  const server = createGeoServer({
    token,
    log: (event) => {
      if (event.status === 'completed' || event.status === 'failed') completed.resolve(event.status);
    },
    capture: async (question) => {
      captures++;
      started.resolve();
      await release.promise;
      return captureFixture(browser, question);
    },
  });
  server.listen(0, '127.0.0.1');
  t.after(async () => {
    release.resolve();
    await new Promise((resolve) => server.close(resolve));
    await browser.close();
  });
  if (!server.listening) await new Promise((resolve) => server.once('listening', resolve));

  const root = `http://127.0.0.1:${server.address().port}/internal/v1/tasks`;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const task = { task_id: 'task_test', platform: 'deepseek', question: 'test question' };
  const options = { method: 'POST', body: JSON.stringify(task), headers };
  assert.equal((await fetch(root, { ...options, headers: { 'Content-Type': 'application/json' } })).status, 401);
  assert.equal((await fetch(`${root}/task_test`, { headers: { Authorization: `Bearer ${randomBytes(32).toString('base64url')}` } })).status, 401);
  const accepted = await fetch(root, options);
  assert.equal(accepted.status, 202);
  assert.deepEqual(await accepted.json(), { task_id: task.task_id, status: 'queued' });

  await started.promise;
  assert.equal((await fetch(`${root}/task_test/screenshot`, { headers })).status, 409);
  const duplicate = await fetch(root, options);
  assert.equal(duplicate.status, 202);
  assert.deepEqual(await duplicate.json(), { task_id: task.task_id, status: 'running' });
  assert.equal((await fetch(root, { ...options, body: JSON.stringify({ ...task, question: 'different' }) })).status, 409);
  release.resolve();
  assert.equal(await completed.promise, 'completed');

  for (let index = 0; index < 2; index++) {
    const result = await fetch(`${root}/task_test`, { headers }).then((response) => response.json());
    assert.equal(result.status, 'completed');
    assert.deepEqual(result.result.citations, expectedCitations);
  }
  assert.equal(captures, 1);
  assert.equal((await fetch(`${root}/task_test/screenshot`)).status, 401);
  const head = await fetch(`${root}/task_test/screenshot`, { method: 'HEAD', headers });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get('Content-Type'), 'image/png');
  const image = await fetch(`${root}/task_test/screenshot`, { headers });
  assert.equal(image.status, 200);
  assert.equal((await image.arrayBuffer()).byteLength, Number(head.headers.get('Content-Length')));
});

const deepSeekPage = `<!doctype html><meta charset="utf-8">
<a href="https://example.com/sidebar">Sidebar</a>
<p class="ds-markdown">Old conversation</p>
<form>
  <textarea id="chat-input"></textarea>
  <button type="button" aria-pressed="false">智能搜索</button>
  <button type="submit">发送</button>
</form>
<button aria-label="停止生成" hidden>停止</button>
<button id="sources" hidden>已搜索到 2 个网页</button>
<aside hidden><a href="https://example.com/announcement">官方公告</a></aside>
<script>
  const form = document.querySelector('form');
  const search = form.querySelector('button');
  const stop = document.querySelector('[aria-label="停止生成"]');
  const sources = document.querySelector('#sources');
  search.onclick = () => search.setAttribute('aria-pressed', search.getAttribute('aria-pressed') === 'false');
  sources.onclick = () => {
    const panel = document.querySelector('aside');
    panel.hidden = false;
    setTimeout(() => panel.insertAdjacentHTML('beforeend', '<a href="https://example.org/source">来源</a>'), 400);
  };
  if (localStorage.getItem('test-profile') !== 'ready') {
    form.hidden = true;
    form.insertAdjacentHTML('afterend', '<input type="tel" aria-label="手机号">');
  }
  form.onsubmit = (event) => {
    event.preventDefault();
    if (!search.hidden && search.getAttribute('aria-pressed') !== 'true') throw new Error('Expected search mode');
    if (document.querySelector('#chat-input').value === 'challenge') {
      form.insertAdjacentHTML('afterend', '<div class="ds-shumei-captcha-modal">安全验证</div>');
      return;
    }
    const answer = document.createElement('p');
    answer.className = 'ds-markdown';
    answer.textContent = '部分回答';
    form.after(answer);
    // Keep the incomplete text around longer than the test's quiet window.
    stop.hidden = false;
    setTimeout(() => {
      answer.textContent = '完整回答：' + document.querySelector('#chat-input').value;
      stop.hidden = true;
      sources.hidden = false;
    }, 650);
  };
</script>`;

test('reuses a private Chromium profile and captures a newly generated DeepSeek web answer', { timeout: 25_000 }, async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'geo-profile-'));
  let context;
  t.after(async () => {
    await context?.close();
    await rm(directory, { force: true, recursive: true });
  });

  let navigations = 0;
  let renderedPage = deepSeekPage;
  const localPageRoute = (route) => {
    if (route.request().url() !== deepSeekURL) return route.abort();
    navigations++;
    return route.fulfill({ contentType: 'text/html; charset=utf-8', body: renderedPage });
  };

  context = await launchDeepSeekProfile(directory, { headless: true });
  await context.route('**/*', localPageRoute);
  const signedOut = createDeepSeekCollector(context, { timeoutMs: 4000 });
  await assert.rejects(signedOut('sample'), { code: 'login_required' });
  const afterFirstFailure = navigations;
  await assert.rejects(signedOut('sample'), { code: 'login_required' });
  assert.equal(navigations, afterFirstFailure);

  const page = context.pages()[0] ?? await context.newPage();
  await page.goto(deepSeekURL);
  await page.evaluate(() => localStorage.setItem('test-profile', 'ready'));
  await context.close();

  context = await launchDeepSeekProfile(directory, { headless: true });
  await context.route('**/*', localPageRoute);
  const collect = createDeepSeekCollector(context, { timeoutMs: 8000, quietMs: 100 });
  const { result, screenshot } = await collect('查询官方公告');
  assert.equal(result.answer, '完整回答：查询官方公告');
  assert.equal(result.source, 'deepseek_web');
  assert.deepEqual(result.citations, [
    { title: '官方公告', url: 'https://example.com/announcement' },
    { title: '来源', url: 'https://example.org/source' },
  ]);
  assert.equal(screenshot.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.deepEqual(parseTaskResult({ taskId: 'task_test' }, { task_id: 'task_test', status: 'completed', result }), { status: 'SUCCESS' });

  renderedPage = deepSeekPage.replace('type="button" aria-pressed', 'type="button" hidden aria-pressed');
  const automatic = await collect('查找发布说明');
  assert.match(automatic.result.answer, /查找发布说明.*请先联网检索公开资料/);
  assert.deepEqual(automatic.result.citations, result.citations);

  renderedPage = renderedPage.replace('sources.hidden = false;', '');
  await assert.rejects(collect('查找无引用资料'), { code: 'citations_unavailable' });

  renderedPage = deepSeekPage;
  await assert.rejects(collect('challenge'), { code: 'human_challenge' });
  const afterChallenge = navigations;
  await assert.rejects(collect('another question'), { code: 'human_challenge' });
  assert.equal(navigations, afterChallenge);
});
