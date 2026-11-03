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
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createInstance } from 'i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'

import { HomeServerFrame } from '../src/features/home/components/home-server-frame'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const webDirectory = resolve(scriptDirectory, '..')
const outputDirectory = resolve(webDirectory, 'dist')
const languages = {
  en: 'en.json',
  zh: 'zh.json',
  'zh-TW': 'zh-TW.json',
  fr: 'fr.json',
  ja: 'ja.json',
  ru: 'ru.json',
  vi: 'vi.json',
} as const
const keys = [
  'MODELS · API · POSSIBILITIES',
  'One gateway, endless AI possibilities.',
  'Built for {{audience}}',
  'developers',
  'Connect leading models through {{brand}}. One familiar API, from your first prototype to your next release.',
  'Explore models',
  'Integration guide',
  'Integration guides',
  'Cherry Studio setup guide',
  'Open WebUI configuration guide',
  'WorkBuddy setup guide',
  'Many models. One connection.',
  'Home',
  'Console',
  'Model Square',
  'Rankings',
  'Docs',
  'Sign in',
  'Toggle navigation menu',
  'Loading...',
  'TaoDock',
  'Models',
  'Routing',
  'Unified API',
  'Logs',
] as const

const resources: Record<string, Record<string, string>> = {}
for (const [language, file] of Object.entries(languages)) {
  const parsed = JSON.parse(
    await readFile(resolve(webDirectory, 'src/i18n/locales', file), 'utf8')
  ) as { translation?: Record<string, string> } & Record<string, string>
  const translation = parsed.translation ?? parsed
  resources[language] = Object.fromEntries(
    keys.map((key) => [key, translation[key] ?? key])
  )
}

const renderer = createInstance()
await renderer.init({
  lng: 'en',
  fallbackLng: 'en',
  initImmediate: false,
  resources: { en: { translation: resources.en } },
  interpolation: { escapeValue: false },
})

function render(custom: boolean) {
  return renderToStaticMarkup(
    <I18nextProvider i18n={renderer}>
      <HomeServerFrame brand='TaoDock' logo='/logo.png' custom={custom} />
    </I18nextProvider>
  )
}

await mkdir(outputDirectory, { recursive: true })
await Promise.all([
  writeFile(resolve(outputDirectory, 'home-fallback.html'), render(false)),
  writeFile(
    resolve(outputDirectory, 'home-custom-fallback.html'),
    render(true)
  ),
  writeFile(
    resolve(outputDirectory, 'home-fallback-copy.json'),
    JSON.stringify(resources).replaceAll('<', '\\u003c')
  ),
])
