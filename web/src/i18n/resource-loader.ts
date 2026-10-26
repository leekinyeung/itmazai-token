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
import type { InterfaceLanguageCode } from './languages'

type LazyLanguageCode = Exclude<InterfaceLanguageCode, 'en'>
type Translation = Record<string, string>

const loaders = {
  zhCN: () => import(/* webpackChunkName: "locale-zh" */ './locales/zh.json'),
  zhTW: () =>
    import(/* webpackChunkName: "locale-zh-TW" */ './locales/zh-TW.json'),
  fr: () => import(/* webpackChunkName: "locale-fr" */ './locales/fr.json'),
  ru: () => import(/* webpackChunkName: "locale-ru" */ './locales/ru.json'),
  ja: () => import(/* webpackChunkName: "locale-ja" */ './locales/ja.json'),
  vi: () => import(/* webpackChunkName: "locale-vi" */ './locales/vi.json'),
} satisfies Record<
  LazyLanguageCode,
  () => Promise<{ default: { translation: Translation } }>
>

const requests = new Map<LazyLanguageCode, Promise<Translation>>()

/** Share successful resources and in-flight imports; failed attempts remain retryable. */
export function loadLanguageResource(
  language: LazyLanguageCode
): Promise<Translation> {
  const existing = requests.get(language)
  if (existing) return existing

  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error('Failed to load language resources')),
      10_000
    )
  })
  const request = Promise.race([
    loaders[language]().then((module) => module.default.translation),
    timeout,
  ])
    .catch(() => {
      requests.delete(language)
      throw new Error('Failed to load language resources')
    })
    .finally(() => clearTimeout(timer))
  requests.set(language, request)
  return request
}
