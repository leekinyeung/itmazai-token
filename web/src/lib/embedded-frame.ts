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
'use client'

export function getEmbeddedFrameSandbox(options: {
  src?: string
  srcDoc?: string
  parentOrigin: string
  sandbox?: string
  allowDownloads?: boolean
}): string {
  const tokens = new Set(
    (
      options.sandbox ??
      'allow-scripts allow-forms allow-popups allow-presentation allow-same-origin'
    )
      .split(/\s+/)
      .filter(Boolean)
  )
  let externalHttpOrigin = false
  try {
    const target = new URL(options.src ?? '', options.parentOrigin)
    externalHttpOrigin =
      (target.protocol === 'https:' || target.protocol === 'http:') &&
      target.origin !== options.parentOrigin
  } catch {
    // Malformed, inline and inherited-origin frames keep an opaque origin.
  }
  // Same-origin scripts could otherwise remove their own sandbox. External
  // apps retain their own origin for storage; they cannot access this app's DOM.
  if (
    tokens.has('allow-scripts') &&
    (options.srcDoc !== undefined || !externalHttpOrigin)
  ) {
    tokens.delete('allow-same-origin')
  }
  if (options.allowDownloads) tokens.add('allow-downloads')
  return [...tokens].join(' ')
}
