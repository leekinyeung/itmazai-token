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

export type GroupDisplayNames = Record<string, Record<string, string>>

export function normalizeGroupDisplayNames(value: unknown): GroupDisplayNames {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {}
  }

  const normalized: GroupDisplayNames = {}
  for (const [group, names] of Object.entries(value)) {
    if (typeof names !== 'object' || names === null || Array.isArray(names)) {
      continue
    }
    const localizedNames: Record<string, string> = {}
    for (const [locale, displayName] of Object.entries(names)) {
      if (typeof displayName === 'string' && displayName.trim()) {
        localizedNames[locale] = displayName
      }
    }
    if (Object.keys(localizedNames).length > 0) {
      normalized[group] = localizedNames
    }
  }
  return normalized
}

export function resolveGroupDisplayName(
  group: string,
  displayNames: GroupDisplayNames,
  language: string
): string {
  const localizedNames = displayNames[group]
  if (!localizedNames) return group

  const normalizedNames = new Map<string, string>()
  for (const [locale, value] of Object.entries(localizedNames)) {
    if (typeof value !== 'string' || value.trim() === '') continue
    normalizedNames.set(locale.trim().replaceAll('_', '-').toLowerCase(), value)
  }

  for (const locale of getGroupLocaleFallbacks(language)) {
    const displayName = normalizedNames.get(locale)
    if (displayName !== undefined) return displayName
  }
  return group
}

export function formatGroupDisplayName(
  group: string,
  displayNames: GroupDisplayNames,
  language: string,
  showIdentifier = false
): string {
  const displayName = resolveGroupDisplayName(group, displayNames, language)
  if (!showIdentifier || displayName === group) return displayName
  return `${displayName} · ${group}`
}

function getGroupLocaleFallbacks(language: string): string[] {
  const normalized = language.trim().replaceAll('_', '-').toLowerCase()
  const locales: string[] = []
  const add = (locale: string) => {
    if (locale && !locales.includes(locale)) locales.push(locale)
  }

  if (normalized === 'zhtw') {
    add('zh-tw')
    add('zh')
  } else if (normalized === 'zhcn') {
    add('zh')
  } else {
    add(normalized)
    if (normalized.includes('-')) {
      add(normalized.slice(0, normalized.indexOf('-')))
    }
  }
  add('en')
  return locales
}
