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
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { toIntlLocale } from '@/i18n/languages'
import { getPublicPageMetadata } from '@/lib/public-page-metadata'
import { getSystemDisplayName } from '@/lib/system-branding'

/** Keep browser metadata in sync with the active page and system branding. */
export function usePageMetadata(systemName: string, pathname: string): void {
  const { i18n, t } = useTranslation()
  const displayName = getSystemDisplayName(systemName, t)
  const page = getPublicPageMetadata(pathname)
  const values = { systemName: displayName, modelName: page?.modelName }
  let title = displayName
  if (page) {
    title = page.isHome
      ? page.title
      : `${t(page.title, values)} | ${displayName}`
  }
  let description = t(
    'Connect leading AI models through one familiar API, from your first prototype to your next production release.'
  )
  if (page) description = t(page.description, values)
  const canonicalUrl = page?.canonicalUrl ?? null
  const language =
    page?.language ||
    toIntlLocale(i18n.resolvedLanguage || i18n.language) ||
    'en'

  useEffect(() => {
    document.title = title
    document.documentElement.lang = language
    for (const [selector, content] of [
      ['meta[name="title"]', title],
      ['meta[name="description"]', description],
      ['meta[property="og:title"]', title],
      ['meta[property="og:description"]', description],
      ['meta[property="og:site_name"]', displayName],
      ['meta[name="twitter:title"]', title],
      ['meta[name="twitter:description"]', description],
    ]) {
      document.querySelector(selector)?.setAttribute('content', content)
    }
    const ensureMeta = (
      attribute: 'name' | 'property',
      key: string,
      content: string
    ) => {
      let meta = document.querySelector<HTMLMetaElement>(
        `meta[${attribute}="${key}"]`
      )
      meta ??= document.createElement('meta')
      meta.setAttribute(attribute, key)
      meta.setAttribute('content', content)
      if (!meta.isConnected) document.head.appendChild(meta)
      return meta
    }
    ensureMeta('property', 'og:type', page?.ogType || 'website')
    const publishedAt = document.querySelector<HTMLMetaElement>(
      'meta[property="article:published_time"]'
    )
    const updatedAt = document.querySelector<HTMLMetaElement>(
      'meta[property="article:modified_time"]'
    )
    if (page?.publishedAt) {
      ensureMeta('property', 'article:published_time', page.publishedAt)
    } else {
      publishedAt?.remove()
    }
    if (page?.updatedAt) {
      ensureMeta('property', 'article:modified_time', page.updatedAt)
    } else {
      updatedAt?.remove()
    }
    let canonical = document.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]'
    )
    let openGraphUrl = document.querySelector<HTMLMetaElement>(
      'meta[property="og:url"]'
    )
    if (!canonicalUrl) {
      canonical?.remove()
      openGraphUrl?.remove()
      return
    }
    canonical ??= document.createElement('link')
    canonical.rel = 'canonical'
    canonical.href = canonicalUrl
    if (!canonical.isConnected) document.head.appendChild(canonical)
    openGraphUrl ??= document.createElement('meta')
    openGraphUrl.setAttribute('property', 'og:url')
    openGraphUrl.setAttribute('content', canonicalUrl)
    if (!openGraphUrl.isConnected) document.head.appendChild(openGraphUrl)
    return () => {
      canonical.remove()
      openGraphUrl.remove()
    }
  }, [canonicalUrl, description, displayName, language, page, title])
}
