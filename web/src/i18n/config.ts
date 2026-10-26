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
import i18n, { type BackendModule } from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import { initializeFrontendCache } from '@/lib/frontend-cache'

import {
  convertDetectedLanguage,
  INTERFACE_LANGUAGE_OPTIONS,
} from './languages'
import en from './locales/en.json'
import { loadLanguageResource } from './resource-loader'

initializeFrontendCache()

const backend: BackendModule = {
  type: 'backend',
  init() {},
  async read(language, namespace) {
    if (namespace !== 'translation') {
      throw new Error('Unsupported translation namespace')
    }
    if (language === 'en') {
      return en.translation
    }
    const code = INTERFACE_LANGUAGE_OPTIONS.find(
      (option) => option.code === language
    )?.code
    if (!code || code === 'en') {
      throw new Error('Unsupported interface language')
    }
    return loadLanguageResource(code)
  },
}

export const i18nReady = i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .use(backend)
  .init({
    resources: { en },
    partialBundledLanguages: true,
    fallbackLng: 'en',
    supportedLngs: INTERFACE_LANGUAGE_OPTIONS.map((option) => option.code),
    load: 'currentOnly',
    nsSeparator: false, // Allow literal colons in keys (e.g., URLs, labels)
    debug: import.meta.env.DEV,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      // Browsers report `zh-CN`/`zh-TW`/`zh`; map them onto our `zhCN`/`zhTW`
      // codes (non-Chinese codes pass through for normal supportedLngs matching).
      convertDetectedLanguage: (value) => {
        const converted = convertDetectedLanguage(value)
        const base = converted.split('-')[0].toLowerCase()
        return (
          INTERFACE_LANGUAGE_OPTIONS.find(
            (option) => option.code === converted || option.code === base
          )?.code ?? converted
        )
      },
    },
  })

let languageSelection = 0

/** Commit a preference only after its resources are ready and it is still the latest choice. */
export async function changeInterfaceLanguage(
  language: string
): Promise<boolean> {
  const selection = ++languageSelection
  await i18nReady
  const detected = convertDetectedLanguage(language)
  const matched = i18n.services.languageUtils.getBestMatchFromCodes([detected])
  const code =
    INTERFACE_LANGUAGE_OPTIONS.find((option) => option.code === matched)
      ?.code ?? 'en'
  try {
    if (code !== 'en') {
      const translation = await loadLanguageResource(code)
      i18n.addResourceBundle(code, 'translation', translation)
    }
  } catch (error) {
    if (selection !== languageSelection) return false
    throw error
  }
  if (selection !== languageSelection) return false
  await i18n.changeLanguage(code)
  return true
}

export default i18n
