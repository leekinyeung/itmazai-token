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
    const pageTitle = t(page.title, values)
    title = page.isHome
      ? `${displayName} | ${pageTitle}`
      : `${pageTitle} | ${displayName}`
  }
  let description = t(
    'Connect apps and agents to text, image, audio and video models through one unified AI API. Explore model pricing and integration guides.'
  )
  if (page) description = t(page.description, values)
  const canonicalUrl = page?.canonicalUrl ?? null
  const language = toIntlLocale(i18n.resolvedLanguage || i18n.language) || 'en'

  useEffect(() => {
    document.title = title
    document.documentElement.lang = language
    for (const [selector, content] of [
      ['meta[name="title"]', title],
      ['meta[name="description"]', description],
      ['meta[property="og:title"]', title],
      ['meta[property="og:description"]', description],
      ['meta[property="og:site_name"]', displayName],
      ['meta[property="og:url"]', canonicalUrl || 'https://taodock.com/'],
      ['meta[name="twitter:title"]', title],
      ['meta[name="twitter:description"]', description],
    ]) {
      document.querySelector(selector)?.setAttribute('content', content)
    }
    let canonical = document.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]'
    )
    if (!canonicalUrl) {
      canonical?.remove()
      return
    }
    canonical ??= document.createElement('link')
    canonical.rel = 'canonical'
    canonical.href = canonicalUrl
    if (!canonical.isConnected) document.head.appendChild(canonical)
    return () => canonical.remove()
  }, [canonicalUrl, description, displayName, language, title])
}
