/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Marked, Renderer } from 'marked'

import {
  parsePublicContent,
  validatePublicContentCollection,
  type GeneratedPublicContentPage,
  type PublicContentFaqItem,
  type PublicContentManifest,
  type PublicContentPage,
  type PublicContentStep,
} from '../src/features/public-content/content-schema'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const webDirectory = resolve(scriptDirectory, '..')
const contentDirectory = resolve(webDirectory, 'src/content')
const publicDirectory = resolve(webDirectory, 'public')
const origin = 'https://taodock.com'

const baseLastModified: Record<string, string> = {
  '/': '2026-11-04',
  '/about': '2026-11-02',
  '/integrations': '2026-11-04',
  '/model-evaluation': '2026-11-04',
  '/models': '2026-11-04',
  '/privacy-policy': '2026-11-02',
  '/rankings': '2026-11-02',
  '/user-agreement': '2026-11-03',
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

const renderer = new Renderer()
renderer.html = ({ text }) => escapeHtml(text)
const markdown = new Marked({ gfm: true, breaks: false, renderer })

function renderMarkdown(body: string): string {
  const output = markdown.parse(body)
  if (typeof output !== 'string') {
    throw new Error('Public Markdown rendering unexpectedly became async')
  }
  return output
}

async function markdownFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await markdownFiles(path)))
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(path)
  }
  return files.sort()
}

function breadcrumbData(page: PublicContentPage) {
  const parent = page.kind === 'comparison' ? '/compare' : '/integrations'
  const parentName =
    page.kind === 'comparison' ? 'AI gateway comparisons' : 'Integrations'
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
      {
        '@type': 'ListItem',
        position: 2,
        name: page.kind === 'faq' ? 'FAQ' : parentName,
        item: `${origin}${page.kind === 'faq' ? '/faq' : parent}`,
      },
      ...(page.kind === 'faq'
        ? []
        : [
            {
              '@type': 'ListItem',
              position: 3,
              name: page.title,
              item: `${origin}${page.path}`,
            },
          ]),
    ],
  }
}

function articleData(page: PublicContentPage) {
  return {
    '@type': 'Article',
    headline: page.title,
    description: page.description,
    datePublished: page.publishedAt,
    dateModified: page.updatedAt,
    inLanguage: 'en',
    mainEntityOfPage: `${origin}${page.path}`,
    author: { '@type': 'Organization', name: 'TaoDock' },
    publisher: { '@type': 'Organization', name: 'TaoDock', url: origin },
  }
}

function howToData(page: PublicContentPage) {
  return {
    '@type': 'HowTo',
    name: page.title,
    description: page.description,
    dateModified: page.updatedAt,
    inLanguage: 'en',
    step: page.steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.title,
      text: step.description,
    })),
  }
}

function faqData(items: PublicContentFaqItem[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }
}

function structuredData(page: PublicContentPage): string[] {
  const values: Record<string, unknown>[] = [breadcrumbData(page)]
  if (page.kind === 'integration') values.push(howToData(page))
  else if (page.kind === 'faq') values.push(faqData(page.faqItems))
  else values.push(articleData(page))
  if (page.kind !== 'faq' && page.faqItems.length > 0) {
    values.push(faqData(page.faqItems))
  }
  return values.map((value) =>
    JSON.stringify({ '@context': 'https://schema.org', ...value }).replaceAll(
      '<',
      '\\u003c'
    )
  )
}

function renderSteps(steps: PublicContentStep[]): string {
  if (steps.length === 0) return ''
  return `<section><h2>Setup steps</h2><ol>${steps
    .map(
      (step) =>
        `<li><h3>${escapeHtml(step.title)}</h3><p>${escapeHtml(step.description)}</p></li>`
    )
    .join('')}</ol></section>`
}

function renderFaq(items: PublicContentFaqItem[]): string {
  if (items.length === 0) return ''
  return `<section><h2>Frequently asked questions</h2>${items
    .map(
      (item) =>
        `<details><summary>${escapeHtml(item.question)}</summary><p>${escapeHtml(item.answer)}</p></details>`
    )
    .join('')}</section>`
}

function renderSources(page: PublicContentPage): string {
  if (page.sources.length === 0) return ''
  return `<section><h2>Sources and review notes</h2><ul>${page.sources
    .map(
      (source) =>
        `<li><a href="${escapeHtml(source.url)}">${escapeHtml(source.label)}</a></li>`
    )
    .join('')}</ul></section>`
}

function renderRelated(page: PublicContentPage): string {
  if (page.related.length === 0) return ''
  return `<nav aria-label="Related resources"><h2>Related resources</h2><ul>${page.related
    .map(
      (path) => `<li><a href="${escapeHtml(path)}">${escapeHtml(path)}</a></li>`
    )
    .join('')}</ul></nav>`
}

function renderFallback(page: PublicContentPage): string {
  const parentPath = page.kind === 'comparison' ? '/compare' : '/integrations'
  const parentLabel =
    page.kind === 'comparison' ? 'Comparisons' : 'Integrations'
  const breadcrumb =
    page.kind === 'faq'
      ? `<a href="/">Home</a> / FAQ`
      : `<a href="/">Home</a> / <a href="${parentPath}">${parentLabel}</a> / ${escapeHtml(page.subject || page.title)}`
  const reviewed = page.reviewedAt
    ? `<p>Reviewed ${escapeHtml(page.reviewedAt)} · Updated ${escapeHtml(page.updatedAt)}</p>`
    : `<p>Updated ${escapeHtml(page.updatedAt)}</p>`
  const docs = page.docsUrl
    ? `<p><a href="${escapeHtml(page.docsUrl)}">Read the full documentation</a></p>`
    : ''
  return `<main class="server-fallback server-fallback--content" data-server-fallback="public-content"><article><nav aria-label="Breadcrumb">${breadcrumb}</nav><header class="server-fallback__hero"><p class="server-fallback__eyebrow">${escapeHtml(page.cluster)}</p><h1>${escapeHtml(page.title)}</h1><p class="server-fallback__lead">${escapeHtml(page.description)}</p>${reviewed}</header>${renderSteps(page.steps)}<div class="server-fallback__article">${renderMarkdown(page.body)}</div>${renderFaq(page.faqItems)}${renderSources(page)}${docs}${renderRelated(page)}<section><h2>Start building with TaoDock</h2><p>Create an account, generate a dedicated API key, and verify the models available to that key before sending production traffic.</p><nav aria-label="Get started"><a href="/sign-up">Create an account</a><a href="/models">Browse models and pricing</a></nav></section></article></main>`
}

function compareHubStructuredData(pages: PublicContentPage[]): string[] {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'AI API Gateway Comparisons',
      description:
        'Compare TaoDock with established AI gateways and model routing platforms using sourced, review-dated decision guides.',
      url: `${origin}/compare`,
      inLanguage: 'en',
      hasPart: pages.map((page) => ({
        '@type': 'Article',
        name: page.title,
        url: `${origin}${page.path}`,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'AI gateway comparisons',
          item: `${origin}/compare`,
        },
      ],
    },
  ].map((value) => JSON.stringify(value).replaceAll('<', '\\u003c'))
}

function renderCompareHub(pages: PublicContentPage[]): string {
  return `<main class="server-fallback server-fallback--content" data-server-fallback="public-content"><header class="server-fallback__hero"><p class="server-fallback__eyebrow">AI gateway comparisons</p><h1>Compare TaoDock with other AI API gateways</h1><p class="server-fallback__lead">Use sourced, review-dated guides to compare deployment models, provider access, routing, key controls, usage records and operational trade-offs.</p></header><section><h2>Comparison guides</h2><div class="server-fallback__card-list">${pages
    .map(
      (page) =>
        `<article class="server-fallback__card"><h3><a href="${page.path}">${escapeHtml(page.subject || page.title)}</a></h3><p>${escapeHtml(page.description)}</p><p>Reviewed ${escapeHtml(page.reviewedAt || page.updatedAt)}</p></article>`
    )
    .join(
      ''
    )}</div></section><section><h2>Choose by operating model</h2><p>Start with the deployment, ownership and control model your team needs. Then verify protocol coverage, routing behavior, access controls, usage records and current commercial terms from the linked official sources.</p><nav aria-label="Get started"><a href="/sign-up">Create an account</a><a href="/models">Browse models and pricing</a></nav></section></main>`
}

function metadataFor(page: PublicContentPage) {
  return {
    title: page.title,
    description: page.description,
    language: 'en',
    ogType: page.kind === 'faq' ? 'website' : 'article',
    publishedAt: page.publishedAt,
    updatedAt: page.updatedAt,
  }
}

function xmlEscape(value: string): string {
  return escapeHtml(value).replaceAll("'", '&apos;')
}

const files = await markdownFiles(contentDirectory)
const pages = validatePublicContentCollection(
  await Promise.all(
    files.map(async (file) =>
      parsePublicContent(
        relative(contentDirectory, file),
        await readFile(file, 'utf8')
      )
    )
  )
)
const comparisonPages = pages.filter((page) => page.kind === 'comparison')
if (comparisonPages.length === 0) {
  throw new Error('At least one comparison page is required for /compare')
}
const compareUpdatedAt = comparisonPages
  .map((page) => page.updatedAt)
  .sort()
  .at(-1) as string
const compareStructuredData = compareHubStructuredData(comparisonPages)
const generatedPages: GeneratedPublicContentPage[] = pages.map((page) => ({
  kind: page.kind,
  slug: page.slug,
  path: page.path,
  title: page.title,
  description: page.description,
  primaryKeyword: page.primaryKeyword,
  cluster: page.cluster,
  subject: page.subject,
  publishedAt: page.publishedAt,
  updatedAt: page.updatedAt,
  reviewedAt: page.reviewedAt,
  sources: page.sources,
  related: page.related,
  steps: page.steps,
  docsUrl: page.docsUrl,
  faqItems: page.faqItems,
  draft: page.draft,
  body: page.body,
  structuredData: structuredData(page),
}))
const manifest: PublicContentManifest = {
  version: 1,
  origin,
  compareHub: {
    path: '/compare',
    title: 'AI API Gateway Comparisons',
    description:
      'Compare TaoDock with OpenRouter, LiteLLM, Portkey, Requesty and SiliconFlow across deployment, routing, access, usage and operational trade-offs.',
    updatedAt: compareUpdatedAt,
    structuredData: compareStructuredData,
  },
  pages: generatedPages,
}
const fallbackManifest = {
  version: 1,
  pages: Object.fromEntries([
    [
      '/compare',
      {
        html: renderCompareHub(comparisonPages),
        structuredData: compareStructuredData,
      },
    ],
    ...pages.map((page) => [
      page.path,
      { html: renderFallback(page), structuredData: structuredData(page) },
    ]),
  ]),
}

const baseMetadata = JSON.parse(
  await readFile(resolve(scriptDirectory, 'page-metadata.base.json'), 'utf8')
) as {
  origin: string
  siteName: string
  noIndexRoutes: string[]
  pages: Record<string, Record<string, string>>
}
baseMetadata.pages['/compare'] = {
  title: manifest.compareHub.title,
  description: manifest.compareHub.description,
  language: 'en',
  ogType: 'website',
  updatedAt: compareUpdatedAt,
}
for (const page of pages) baseMetadata.pages[page.path] = metadataFor(page)

const sitemapEntries = [
  ...Object.entries(baseLastModified),
  ['/compare', compareUpdatedAt] as const,
  ...pages.map((page) => [page.path, page.updatedAt] as const),
].sort(([left], [right]) => left.localeCompare(right))
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries
  .map(
    ([path, lastModified]) =>
      `  <url>\n    <loc>${xmlEscape(`${origin}${path === '/' ? '/' : path}`)}</loc>\n    <lastmod>${lastModified}</lastmod>\n  </url>`
  )
  .join('\n')}\n</urlset>\n`

const serialize = (value: unknown) =>
  `${JSON.stringify(value, null, 2).replaceAll('<', '\\u003c')}\n`
await Promise.all([
  writeFile(
    resolve(publicDirectory, 'public-content.json'),
    serialize(manifest)
  ),
  writeFile(
    resolve(publicDirectory, 'public-content-fallback.json'),
    serialize(fallbackManifest)
  ),
  writeFile(
    resolve(publicDirectory, 'page-metadata.json'),
    serialize(baseMetadata)
  ),
  writeFile(resolve(publicDirectory, 'sitemap.xml'), sitemap),
])
