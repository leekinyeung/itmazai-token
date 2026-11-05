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

import {
  parsePublicContent,
  validatePublicContentCollection,
  type GeneratedPublicContentPage,
  type PublicContentFaqItem,
  type PublicContentManifest,
  type PublicContentPage,
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

function metadataFor(page: PublicContentPage) {
  return {
    title: page.title,
    description: page.description,
    language: 'en',
    ogType: page.kind === 'faq' ? 'website' : 'article',
    publishedAt: page.publishedAt,
    updatedAt: page.updatedAt,
    structuredData: structuredData(page),
  }
}

function xmlEscape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
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
const baseMetadata = JSON.parse(
  await readFile(resolve(scriptDirectory, 'page-metadata.base.json'), 'utf8')
) as {
  origin: string
  siteName: string
  noIndexRoutes: string[]
  pages: Record<string, Record<string, unknown>>
}
baseMetadata.pages['/compare'] = {
  title: manifest.compareHub.title,
  description: manifest.compareHub.description,
  language: 'en',
  ogType: 'website',
  updatedAt: compareUpdatedAt,
  structuredData: compareStructuredData,
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
    resolve(publicDirectory, 'page-metadata.json'),
    serialize(baseMetadata)
  ),
  writeFile(resolve(publicDirectory, 'sitemap.xml'), sitemap),
])
