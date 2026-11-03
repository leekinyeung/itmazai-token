import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const output = resolve('.vitepress/dist')

async function verifyPage(path, calloutCount, language) {
  const html = await readFile(resolve(output, path), 'utf8')
  const markers = html.match(/data-taodock-conversion-callout/g) ?? []
  assert.equal(markers.length, calloutCount, `${path}: callout count`)
  assert.match(html, /data-taodock-console-cta="desktop"/)
  assert.match(html, /href="https:\/\/taodock\.com\/keys"/)
  assert.match(html, /target="_blank"/)
  assert.match(html, /rel="noopener noreferrer"/)
  if (language === 'en') {
    assert.match(html, /Get API Key \(Console\)/)
    assert.match(html, /Need a TaoDock API key\?/)
  } else {
    assert.match(html, /获取 API Key（控制台）/)
    assert.match(html, /还没有 API Key？/)
  }
}

for (const path of [
  'guide/cherry-studio.html',
  'guide/workbuddy.html',
  'guide/open-webui.html',
]) {
  await verifyPage(path, 2, 'zh')
}
await verifyPage('guide/clients.html', 4, 'zh')

for (const path of [
  'en/guide/cherry-studio.html',
  'en/guide/workbuddy.html',
  'en/guide/open-webui.html',
]) {
  await verifyPage(path, 2, 'en')
}
await verifyPage('en/guide/clients.html', 4, 'en')

const chunks = await readdir(resolve(output, 'assets/chunks'))
const themeChunk = chunks.find((file) => file.startsWith('theme.'))
assert.ok(themeChunk, 'theme bundle')
const theme = await readFile(resolve(output, 'assets/chunks', themeChunk), 'utf8')
assert.match(theme, /placement:"desktop"/)
assert.match(theme, /placement:"mobile"/)

const sitemap = await readFile(resolve(output, 'sitemap.xml'), 'utf8')
const sitemapUrls = Array.from(
  sitemap.matchAll(/<loc>(https:\/\/docs\.taodock\.com\/[^<]*)<\/loc>/g),
  (match) => match[1]
)
assert.equal(sitemapUrls.length, 24, 'sitemap URL count')

function getAttribute(tag, name) {
  return tag.match(new RegExp(`${name}="([^"]*)"`))?.[1]
}

for (const url of sitemapUrls) {
  const pathname = new URL(url).pathname
  const path = pathname.endsWith('/')
    ? `${pathname.slice(1)}index.html`
    : pathname.slice(1)
  const html = await readFile(resolve(output, path), 'utf8')
  const canonicalTags = html.match(/<link\b[^>]*rel="canonical"[^>]*>/g) ?? []
  const openGraphUrlTags =
    html.match(/<meta\b[^>]*property="og:url"[^>]*>/g) ?? []
  assert.equal(canonicalTags.length, 1, `${path}: canonical count`)
  assert.equal(openGraphUrlTags.length, 1, `${path}: og:url count`)
  assert.equal(getAttribute(canonicalTags[0], 'href'), url, `${path}: canonical`)
  assert.equal(getAttribute(openGraphUrlTags[0], 'content'), url, `${path}: og:url`)
}

const tutorialTitles = new Map([
  [
    'guide/cherry-studio.html',
    'Cherry Studio 接入自定义大模型 API 完整教程（附 Base URL 配置与排错） - 众妙之门 TaoDock',
  ],
  [
    'guide/workbuddy.html',
    'WorkBuddy 接入自定义大模型 API 完整教程（附 Base URL 配置与排错） - 众妙之门 TaoDock',
  ],
  [
    'guide/open-webui.html',
    'Open WebUI 接入自定义大模型 API 完整教程（附 Base URL 配置与排错） - 众妙之门 TaoDock',
  ],
  [
    'en/guide/cherry-studio.html',
    'Cherry Studio Custom LLM API Setup Guide (Base URL Configuration and Troubleshooting) - TaoDock',
  ],
  [
    'en/guide/workbuddy.html',
    'WorkBuddy Custom LLM API Setup Guide (Base URL Configuration and Troubleshooting) - TaoDock',
  ],
  [
    'en/guide/open-webui.html',
    'Open WebUI Custom LLM API Setup Guide (Base URL Configuration and Troubleshooting) - TaoDock',
  ],
])
for (const [path, title] of tutorialTitles) {
  const html = await readFile(resolve(output, path), 'utf8')
  assert.equal(html.match(/<title>([^<]*)<\/title>/)?.[1], title, `${path}: title`)
}

const notFound = await readFile(resolve(output, '404.html'), 'utf8')
assert.doesNotMatch(notFound, /rel="canonical"/)
assert.doesNotMatch(notFound, /property="og:url"/)

console.log(
  'Verified navigation CTA, conversion callouts, 24 canonical URLs, and tutorial titles.'
)
