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
import publicPages from '../../public/page-metadata.json'
import { modelDetailsPath } from './model-path'

type PublicPageMetadata = {
  title: string
  description: string
  canonicalUrl: string
  isHome: boolean
  language?: string
  modelName?: string
  ogType?: string
  publishedAt?: string
  updatedAt?: string
}

const pages: Record<
  string,
  {
    title: string
    description: string
    language?: string
    ogType?: string
    publishedAt?: string
    updatedAt?: string
  }
> = publicPages.pages

/** Match public page metadata without including private routes or query filters. */
export function getPublicPageMetadata(
  pathname: string
): PublicPageMetadata | null {
  const path = pathname.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/'
  let page = pages[path]
  let modelName: string | undefined
  if (!page && path.startsWith('/models/')) {
    const encodedName = path.slice('/models/'.length)
    if (encodedName.includes('/')) return null
    try {
      modelName = decodeURIComponent(encodedName)
    } catch {
      return null
    }
    if (!modelName.trim() || [...modelName].length > 200) return null
    page = pages['/models/:modelId']
  }
  if (!page) return null
  return {
    ...page,
    canonicalUrl: new URL(
      modelName === undefined ? path : modelDetailsPath(modelName),
      publicPages.origin
    ).href,
    isHome: path === '/',
    modelName,
  }
}
