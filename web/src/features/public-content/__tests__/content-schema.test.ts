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
import { describe, expect, test } from 'vitest'

import {
  getPublicContentPage,
  getPublicContentPages,
  PUBLIC_CONTENT,
} from '@/features/public-content/content-registry'
import {
  parsePublicContent,
  validatePublicContentCollection,
} from '@/features/public-content/content-schema'

function comparisonSource(): string {
  return `---
kind: comparison
slug: example-gateway
title: TaoDock vs Example Gateway Decision Guide
description: Compare deployment, routing, access controls, usage records, and operational trade-offs using review-dated official sources.
primaryKeyword: TaoDock vs Example Gateway
cluster: AI gateway comparisons
subject: Example Gateway
publishedAt: 2026-11-04
updatedAt: 2026-11-04
reviewedAt: 2026-11-04
sources:
  - label: Official documentation
    url: https://example.com/docs
related:
  - /models
draft: false
---

## Positioning

Use official evidence and verify the exact behavior before migrating.
`
}

describe('public content validation', () => {
  test('parses required frontmatter and derives the public route', () => {
    const page = parsePublicContent('comparison.md', comparisonSource())
    expect(page.path).toBe('/compare/example-gateway')
    expect(page.reviewedAt).toBe('2026-11-04')
    expect(page.sources[0]?.url).toBe('https://example.com/docs')
  })

  test.each([
    [
      'invalid date',
      (source: string) =>
        source.replace('updatedAt: 2026-11-04', 'updatedAt: 2026-14-44'),
    ],
    [
      'non-HTTPS source',
      (source: string) =>
        source.replace('https://example.com', 'http://example.com'),
    ],
  ])('rejects %s', (_name, change) => {
    expect(() =>
      parsePublicContent('invalid.md', change(comparisonSource()))
    ).toThrow('invalid frontmatter')
  })

  test.each([
    ['an H1', '# Forbidden heading'],
    ['raw HTML', '<aside>Unsafe</aside>'],
  ])('rejects Markdown containing %s', (_name, body) => {
    const source = comparisonSource().replace(
      '## Positioning\n\nUse official evidence and verify the exact behavior before migrating.',
      body
    )
    expect(() => parsePublicContent('invalid.md', source)).toThrow()
  })

  test('excludes drafts and rejects duplicate or missing internal targets', () => {
    const page = parsePublicContent('one.md', comparisonSource())
    const draft = { ...page, sourceFile: 'draft.md', draft: true }
    expect(validatePublicContentCollection([page, draft])).toEqual([page])
    expect(() =>
      validatePublicContentCollection([
        page,
        { ...page, sourceFile: 'duplicate.md' },
      ])
    ).toThrow('Duplicate public content slug')
    expect(() =>
      validatePublicContentCollection([
        { ...page, related: ['/missing'], sourceFile: 'missing.md' },
      ])
    ).toThrow('unknown related path')
  })
})

test('the generated manifest publishes exactly the launch set and valid JSON-LD', () => {
  expect(PUBLIC_CONTENT.pages).toHaveLength(12)
  expect(getPublicContentPages('comparison')).toHaveLength(5)
  expect(getPublicContentPages('integration')).toHaveLength(6)
  expect(getPublicContentPages('faq')).toHaveLength(1)
  expect(getPublicContentPage('/blog/not-published')).toBeNull()
  for (const page of PUBLIC_CONTENT.pages) {
    expect(page.draft).toBe(false)
    expect(page.structuredData.length).toBeGreaterThan(0)
    for (const value of page.structuredData) {
      const parsed = JSON.parse(value)
      expect(parsed['@context']).toBe('https://schema.org')
      expect(parsed['@type']).toBeTruthy()
    }
  }
})
