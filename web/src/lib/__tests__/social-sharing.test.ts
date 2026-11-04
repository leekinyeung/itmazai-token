/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const webRoot = resolve(import.meta.dirname, '../../..')
// Parse the server's HTML without executing the app: this is what card
// crawlers need, regardless of the browser's saved language or branding.
const head = new DOMParser().parseFromString(
  readFileSync(resolve(webRoot, 'index.html'), 'utf8'),
  'text/html'
).head
const metadata = Object.fromEntries(
  Array.from(head.querySelectorAll('meta[name], meta[property]'), (tag) => [
    tag.getAttribute('name') || tag.getAttribute('property'),
    tag.getAttribute('content'),
  ])
)
const pageMetadata = JSON.parse(
  readFileSync(resolve(webRoot, 'public/page-metadata.json'), 'utf8')
) as {
  siteName: string
  pages: Record<
    string,
    { title: string; description: string; language?: string }
  >
  noIndexRoutes: string[]
}
const homepageTitle = 'Unified AI API Gateway | TaoDock'
const homepageDescription =
  'Connect leading AI models through one familiar API, from your first prototype to your next production release.'

describe('website social sharing', () => {
  it('provides Twitter large image and Open Graph metadata before JavaScript runs', () => {
    expect(metadata).toEqual(
      expect.objectContaining({
        'twitter:card': 'summary_large_image',
        'twitter:title': homepageTitle,
        'twitter:description': metadata.description,
        'twitter:image': 'https://taodock.com/social-card.png',
        'twitter:image:alt': 'TaoDock',
        'og:type': 'website',
        'og:site_name': 'TaoDock',
        'og:title': homepageTitle,
        'og:url': 'https://taodock.com/',
        'og:description': metadata.description,
        'og:image': metadata['twitter:image'],
        'og:image:alt': metadata['twitter:image:alt'],
        'og:image:type': 'image/png',
      })
    )
    expect(metadata.description).toBeTruthy()
    for (const key of [
      'title',
      'description',
      'og:site_name',
      'og:title',
      'og:description',
      'twitter:title',
      'twitter:description',
    ]) {
      expect(metadata[key]).not.toMatch(/[\u3400-\u9fff]/)
    }
  })

  it('describes the homepage in the initial HTML before JavaScript runs', () => {
    expect(head.querySelector('title')?.textContent?.trim()).toBe(homepageTitle)
    expect(metadata.title).toBe(homepageTitle)
    expect(metadata.description).toBe(homepageDescription)
    expect(head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1)
    expect(
      head.querySelector('link[rel="canonical"]')?.getAttribute('href')
    ).toBe('https://taodock.com/')
  })

  it('keeps core public page titles within 60 characters and branded with TaoDock', () => {
    expect(pageMetadata.siteName).toBe('TaoDock')
    for (const [path, page] of Object.entries(pageMetadata.pages)) {
      if (path.includes(':') || page.language) continue
      const title = path === '/' ? page.title : `${page.title} | TaoDock`
      expect(title).toMatch(/\| TaoDock$/)
      expect([...title].length).toBeLessThanOrEqual(60)
    }
  })

  it('provides a valid XML sitemap for the core public pages', () => {
    const sitemap = new DOMParser().parseFromString(
      readFileSync(resolve(webRoot, 'public/sitemap.xml'), 'utf8'),
      'application/xml'
    )

    expect(sitemap.querySelector('parsererror')).toBeNull()
    expect(sitemap.documentElement.localName).toBe('urlset')
    expect(sitemap.documentElement.namespaceURI).toBe(
      'http://www.sitemaps.org/schemas/sitemap/0.9'
    )
    const sitemapEntries = Array.from(
      sitemap.querySelectorAll('url'),
      (url) => {
        expect(url.querySelectorAll('loc')).toHaveLength(1)
        expect(url.querySelectorAll('lastmod')).toHaveLength(1)

        const lastmod = url.querySelector('lastmod')?.textContent
        expect(lastmod).toMatch(/^\d{4}-\d{2}-\d{2}$/)

        return {
          loc: url.querySelector('loc')?.textContent,
          lastmod,
        }
      }
    )
    const locations = sitemapEntries.map((entry) => entry.loc)
    expect(locations).toEqual([...locations].sort())
    expect(new Set(sitemapEntries.map((entry) => entry.loc)).size).toBe(
      sitemapEntries.length
    )
    expect(sitemapEntries).toEqual(
      expect.arrayContaining([
        { loc: 'https://taodock.com/', lastmod: '2026-11-04' },
        { loc: 'https://taodock.com/models', lastmod: '2026-11-04' },
        {
          loc: 'https://taodock.com/integrations',
          lastmod: '2026-11-04',
        },
        {
          loc: 'https://taodock.com/model-evaluation',
          lastmod: '2026-11-04',
        },
        { loc: 'https://taodock.com/about', lastmod: '2026-11-02' },
        { loc: 'https://taodock.com/rankings', lastmod: '2026-11-02' },
        {
          loc: 'https://taodock.com/privacy-policy',
          lastmod: '2026-11-02',
        },
        {
          loc: 'https://taodock.com/user-agreement',
          lastmod: '2026-11-03',
        },
      ])
    )
    expect(sitemapEntries).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ loc: 'https://taodock.com/pricing' }),
      ])
    )
  })

  it('allows search crawlers and advertises the sitemap in robots.txt', () => {
    const robots = readFileSync(resolve(webRoot, 'public/robots.txt'), 'utf8')

    expect(robots).toMatch(/^User-agent: \*$/m)
    for (const path of [
      '/',
      '/models',
      '/integrations',
      '/model-evaluation',
      '/about',
      '/rankings',
      '/privacy-policy',
      '/user-agreement',
    ]) {
      expect(robots).toMatch(new RegExp(`^Allow: ${path}$`, 'm'))
    }
    for (const path of ['/console/', '/dashboard/', '/v1/']) {
      expect(robots).toMatch(new RegExp(`^Disallow: ${path}$`, 'm'))
    }
    expect(robots.trimEnd().split('\n').slice(-3)).toEqual([
      'Sitemap: https://taodock.com/sitemap.xml',
      'Sitemap: https://taodock.com/sitemap-models.xml',
      'Sitemap: https://docs.taodock.com/sitemap.xml',
    ])
    expect(robots).not.toMatch(/^Disallow:\s*\/\s*$/m)
  })

  it('declares account, authentication and console routes as noindex pages', () => {
    expect(pageMetadata.noIndexRoutes).toEqual(
      expect.arrayContaining([
        '/sign-in',
        '/sign-up',
        '/forgot-password',
        '/oauth/:provider',
        '/dashboard/:section',
        '/keys',
        '/profile',
        '/system-settings',
        '/console/*legacy',
      ])
    )
    expect(pageMetadata.noIndexRoutes).not.toContain('/')
    expect(pageMetadata.noIndexRoutes).not.toContain('/models')
    expect(pageMetadata.noIndexRoutes).toContain('/admin/models/:section')
    expect(pageMetadata.noIndexRoutes).not.toContain('/integrations')

    const sitemap = readFileSync(resolve(webRoot, 'public/sitemap.xml'), 'utf8')
    for (const privatePath of ['/console', '/dashboard', '/v1']) {
      expect(sitemap).not.toContain(`<loc>https://taodock.com${privatePath}`)
    }
  })

  it('references a public landscape PNG with matching dimensions and a file size below 5 MB', () => {
    const imageUrl = new URL(metadata['og:image'] || '')
    expect(imageUrl.origin).toBe('https://taodock.com')
    const image = readFileSync(resolve(webRoot, `public${imageUrl.pathname}`))

    expect(image.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    const width = image.readUInt32BE(16)
    const height = image.readUInt32BE(20)
    expect(width).toBeGreaterThanOrEqual(300)
    expect(height).toBeGreaterThanOrEqual(157)
    expect(width / height).toBeGreaterThanOrEqual(1.8)
    expect(width / height).toBeLessThanOrEqual(2.1)
    expect(metadata['og:image:width']).toBe(String(width))
    expect(metadata['og:image:height']).toBe(String(height))
    expect(image.byteLength).toBeLessThan(5 * 1024 * 1024)
  })
})
