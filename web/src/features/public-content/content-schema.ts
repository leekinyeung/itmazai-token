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
import { parse as parseYaml } from 'yaml'
import { z } from 'zod'

export const PUBLIC_CONTENT_KINDS = [
  'comparison',
  'integration',
  'blog',
  'use-case',
  'faq',
] as const

export type PublicContentKind = (typeof PUBLIC_CONTENT_KINDS)[number]

export type PublicContentSource = {
  label: string
  url: string
}

export type PublicContentStep = {
  title: string
  description: string
}

export type PublicContentFaqItem = {
  question: string
  answer: string
}

export type PublicContentPage = {
  kind: PublicContentKind
  slug: string
  path: string
  title: string
  description: string
  primaryKeyword: string
  cluster: string
  subject?: string
  publishedAt: string
  updatedAt: string
  reviewedAt?: string
  tags: string[]
  coverImage?: string
  sources: PublicContentSource[]
  related: string[]
  steps: PublicContentStep[]
  docsUrl?: string
  faqItems: PublicContentFaqItem[]
  draft: boolean
  body: string
  sourceFile: string
}

export type GeneratedPublicContentPage = Omit<
  PublicContentPage,
  'sourceFile'
> & {
  structuredData: string[]
}

export type PublicContentHubManifest = {
  path: string
  title: string
  description: string
  updatedAt: string
  structuredData: string[]
}

export type PublicContentManifest = {
  version: 1
  origin: string
  compareHub: PublicContentHubManifest
  blogHub: PublicContentHubManifest
  pages: GeneratedPublicContentPage[]
}

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'must use YYYY-MM-DD')
  .refine(
    (value) => {
      const [year, month, day] = value.split('-').map(Number)
      const date = new Date(Date.UTC(year, month - 1, day))
      return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
      )
    },
    { message: 'must be a real calendar date' }
  )

const httpsUrlSchema = z
  .string()
  .url()
  .refine((value) => value.startsWith('https://'), {
    message: 'must use HTTPS',
  })

const sourceSchema = z.object({
  label: z.string().trim().min(1),
  url: httpsUrlSchema,
})

const stepSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
})

const faqItemSchema = z.object({
  question: z.string().trim().min(1),
  answer: z.string().trim().min(1),
})

const frontmatterSchema = z
  .object({
    kind: z.enum(PUBLIC_CONTENT_KINDS),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().trim().min(20).max(90),
    description: z.string().trim().min(80).max(180),
    primaryKeyword: z.string().trim().min(3),
    cluster: z.string().trim().min(3),
    subject: z.string().trim().min(1).optional(),
    publishedAt: dateSchema,
    updatedAt: dateSchema,
    reviewedAt: dateSchema.optional(),
    tags: z
      .array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/))
      .max(8)
      .default([]),
    coverImage: z
      .string()
      .regex(/^\/images\/blog\/[a-z0-9][a-z0-9/-]*\.(?:png|webp|jpe?g)$/)
      .optional(),
    sources: z.array(sourceSchema).default([]),
    related: z.array(z.string().regex(/^\/[a-z0-9][a-z0-9/-]*$/)).default([]),
    steps: z.array(stepSchema).default([]),
    docsUrl: httpsUrlSchema.optional(),
    faqItems: z.array(faqItemSchema).default([]),
    draft: z.boolean().default(false),
  })
  .superRefine((value, context) => {
    if (value.updatedAt < value.publishedAt) {
      context.addIssue({
        code: 'custom',
        path: ['updatedAt'],
        message: 'must not precede publishedAt',
      })
    }
    if (value.reviewedAt && value.reviewedAt < value.publishedAt) {
      context.addIssue({
        code: 'custom',
        path: ['reviewedAt'],
        message: 'must not precede publishedAt',
      })
    }
    if (value.kind === 'comparison') {
      if (!value.reviewedAt) {
        context.addIssue({
          code: 'custom',
          path: ['reviewedAt'],
          message: 'is required for comparison pages',
        })
      }
      if (value.sources.length === 0) {
        context.addIssue({
          code: 'custom',
          path: ['sources'],
          message: 'must include official comparison sources',
        })
      }
      if (!value.subject) {
        context.addIssue({
          code: 'custom',
          path: ['subject'],
          message: 'is required for comparison pages',
        })
      }
    }
    if (value.kind === 'integration') {
      if (!value.reviewedAt) {
        context.addIssue({
          code: 'custom',
          path: ['reviewedAt'],
          message: 'is required for integration pages',
        })
      }
      if (!value.docsUrl) {
        context.addIssue({
          code: 'custom',
          path: ['docsUrl'],
          message: 'is required for integration pages',
        })
      }
      if (value.steps.length === 0) {
        context.addIssue({
          code: 'custom',
          path: ['steps'],
          message: 'must include visible setup steps',
        })
      }
      if (!value.subject) {
        context.addIssue({
          code: 'custom',
          path: ['subject'],
          message: 'is required for integration pages',
        })
      }
    }
    if (value.kind === 'faq' && value.faqItems.length === 0) {
      context.addIssue({
        code: 'custom',
        path: ['faqItems'],
        message: 'must include FAQ entries',
      })
    }
    if (value.kind === 'blog' && !value.reviewedAt) {
      context.addIssue({
        code: 'custom',
        path: ['reviewedAt'],
        message: 'is required for blog posts',
      })
    }
  })

const allowedExistingPublicPaths = new Set([
  '/',
  '/about',
  '/blog',
  '/dashboard',
  '/keys',
  '/integrations',
  '/model-evaluation',
  '/models',
  '/privacy-policy',
  '/rankings',
  '/sign-in',
  '/sign-up',
  '/user-agreement',
])

function stripFencedCode(markdown: string): string {
  return markdown.replaceAll(/^(```|~~~)[^\n]*\n[\s\S]*?^\1\s*$/gm, '')
}

function contentPath(kind: PublicContentKind, slug: string): string {
  switch (kind) {
    case 'comparison':
      return `/compare/${slug}`
    case 'integration':
      return `/integrations/${slug}`
    case 'blog':
      return `/blog/${slug}`
    case 'use-case':
      return `/use-cases/${slug}`
    case 'faq':
      if (slug !== 'faq') throw new Error('FAQ content must use slug "faq"')
      return '/faq'
  }
}

function validateMarkdownBody(file: string, body: string): void {
  const prose = stripFencedCode(body)
  if (/^\s*(?:>\s*)*#\s+/m.test(prose)) {
    throw new Error(`${file}: Markdown body must not contain an H1`)
  }
  if (/<\/?[A-Za-z][^>]*>|<!--/m.test(prose)) {
    throw new Error(`${file}: raw HTML is not allowed in public content`)
  }
  for (const match of prose.matchAll(
    /!?\[[^\]]*\]\(([^)\s]+)(?:\s+[^)]*)?\)/g
  )) {
    const target = match[1]
    if (
      !target.startsWith('/') &&
      !target.startsWith('https://') &&
      !target.startsWith('mailto:') &&
      !target.startsWith('#')
    ) {
      throw new Error(`${file}: unsafe or relative Markdown link ${target}`)
    }
  }
}

export function parsePublicContent(
  sourceFile: string,
  source: string
): PublicContentPage {
  const normalized = source.replaceAll('\r\n', '\n')
  if (!normalized.startsWith('---\n')) {
    throw new Error(`${sourceFile}: missing YAML frontmatter`)
  }
  const boundary = normalized.indexOf('\n---\n', 4)
  if (boundary < 0) {
    throw new Error(`${sourceFile}: unterminated YAML frontmatter`)
  }
  const parsed = frontmatterSchema.safeParse(
    parseYaml(normalized.slice(4, boundary))
  )
  if (!parsed.success) {
    throw new Error(
      `${sourceFile}: invalid frontmatter\n${z.prettifyError(parsed.error)}`
    )
  }
  const body = normalized.slice(boundary + 5).trim()
  if (!body) throw new Error(`${sourceFile}: Markdown body is empty`)
  validateMarkdownBody(sourceFile, body)
  return {
    ...parsed.data,
    path: contentPath(parsed.data.kind, parsed.data.slug),
    body,
    sourceFile,
  }
}

export function validatePublicContentCollection(
  pages: PublicContentPage[]
): PublicContentPage[] {
  const published = pages.filter((page) => !page.draft)
  const paths = new Set<string>()
  const slugs = new Set<string>()
  for (const page of published) {
    if (slugs.has(page.slug)) {
      throw new Error(`Duplicate public content slug: ${page.slug}`)
    }
    slugs.add(page.slug)
    if (paths.has(page.path)) {
      throw new Error(`Duplicate public content path: ${page.path}`)
    }
    paths.add(page.path)
  }
  const validTargets = new Set([
    ...allowedExistingPublicPaths,
    '/compare',
    ...paths,
  ])
  for (const page of published) {
    for (const target of page.related) {
      if (!validTargets.has(target)) {
        throw new Error(`${page.sourceFile}: unknown related path ${target}`)
      }
    }
    const prose = stripFencedCode(page.body)
    for (const match of prose.matchAll(/\]\((\/[^)#?\s]*)(?:[?#][^)]*)?\)/g)) {
      const target = match[1] || '/'
      if (!validTargets.has(target)) {
        throw new Error(`${page.sourceFile}: unknown internal link ${target}`)
      }
    }
  }
  return published.sort((left, right) => left.path.localeCompare(right.path))
}
