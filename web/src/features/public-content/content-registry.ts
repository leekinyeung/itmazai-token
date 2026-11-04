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
import generatedContent from '../../../public/public-content.json'
import type {
  GeneratedPublicContentPage,
  PublicContentKind,
  PublicContentManifest,
} from './content-schema'

export const PUBLIC_CONTENT = generatedContent as PublicContentManifest
export const PUBLIC_CONTENT_PAGES = PUBLIC_CONTENT.pages

const pagesByPath = new Map(
  PUBLIC_CONTENT_PAGES.map((page) => [page.path, page] as const)
)

function normalizePath(path: string): string {
  return path.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/'
}

export function getPublicContentPage(
  path: string,
  kind?: PublicContentKind
): GeneratedPublicContentPage | null {
  const page = pagesByPath.get(normalizePath(path)) ?? null
  return page && (!kind || page.kind === kind) ? page : null
}

export function getPublicContentPages(
  kind: PublicContentKind
): GeneratedPublicContentPage[] {
  return PUBLIC_CONTENT_PAGES.filter((page) => page.kind === kind)
}
