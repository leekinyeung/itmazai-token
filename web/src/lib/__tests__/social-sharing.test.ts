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
const homepageTitle = '众妙之门 TaoDock | Unified AI API for Apps and Agents'
const homepageDescription =
  'Connect apps and agents to text, image, audio and video models through one unified AI API. Explore model pricing and integration guides.'

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
        'og:site_name': '众妙之门 TaoDock',
        'og:title': homepageTitle,
        'og:url': 'https://taodock.com/',
        'og:description': metadata.description,
        'og:image': metadata['twitter:image'],
        'og:image:alt': metadata['twitter:image:alt'],
        'og:image:type': 'image/png',
      })
    )
    expect(metadata.description).toBeTruthy()
  })

  it('describes the homepage in the initial HTML before JavaScript runs', () => {
    expect(head.querySelector('title')?.textContent).toBe(homepageTitle)
    expect(metadata.title).toBe(homepageTitle)
    expect(metadata.description).toBe(homepageDescription)
  })

  it('provides a valid XML sitemap for the homepage and public model pricing page', () => {
    const sitemap = new DOMParser().parseFromString(
      readFileSync(resolve(webRoot, 'public/sitemap.xml'), 'utf8'),
      'application/xml'
    )

    expect(sitemap.querySelector('parsererror')).toBeNull()
    expect(sitemap.documentElement.localName).toBe('urlset')
    expect(sitemap.documentElement.namespaceURI).toBe(
      'http://www.sitemaps.org/schemas/sitemap/0.9'
    )
    expect(
      Array.from(
        sitemap.querySelectorAll('url > loc'),
        (loc) => loc.textContent
      )
    ).toEqual(['https://taodock.com/', 'https://taodock.com/pricing'])
  })

  it('allows search crawlers and advertises the sitemap in robots.txt', () => {
    const robots = readFileSync(resolve(webRoot, 'public/robots.txt'), 'utf8')

    expect(robots).toMatch(/^User-agent: \*$/m)
    expect(robots).toMatch(/^Allow: \/$/m)
    expect(robots).toMatch(/^Sitemap: https:\/\/taodock\.com\/sitemap\.xml$/m)
    expect(robots).not.toMatch(/^Disallow:\s*\/\s*$/m)
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
