import { normalizeInterfaceLanguage } from '@/i18n/languages'

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
import integrationCatalog from '../../../public/integration-catalog.json'
import integrationCopy from '../../../public/integration-copy.en.json'

export type IntegrationId =
  | 'cherry-studio'
  | 'workbuddy'
  | 'open-webui'
  | 'aionui'
  | 'deepchat'
  | 'openai-sdk'

export type IntegrationIconName = IntegrationId

export type IntegrationCatalogItem = {
  id: IntegrationId
  name: string
  icon: IntegrationIconName
  docPath: string
}

type IntegrationPageCopy = {
  eyebrow: string
  title: string
  description: string
  clients: Record<IntegrationId, string>
  stepsTitle: string
  steps: Array<{ title: string; description: string }>
  pricingLink: string
  docsLink: string
}

export const INTEGRATION_CATALOG =
  integrationCatalog as IntegrationCatalogItem[]
export const INTEGRATION_COPY = integrationCopy as IntegrationPageCopy

export function getIntegrationDocUrl(
  docPath: string,
  language?: string | null
): string {
  const normalized = normalizeInterfaceLanguage(language)
  const languagePath =
    normalized === 'zhCN' || normalized === 'zhTW' ? '' : '/en'
  return `https://docs.taodock.com${languagePath}${docPath}`
}
