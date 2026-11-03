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
import { INTEGRATION_CATALOG, type IntegrationId } from './catalog'

const FEATURED_GUIDE_LABELS: Array<{
  id: IntegrationId
  labelKey: string
}> = [
  { id: 'cherry-studio', labelKey: 'Cherry Studio setup guide' },
  { id: 'open-webui', labelKey: 'Open WebUI configuration guide' },
  { id: 'workbuddy', labelKey: 'WorkBuddy setup guide' },
]

export const FEATURED_INTEGRATION_GUIDES = FEATURED_GUIDE_LABELS.map(
  (featured) => {
    const integration = INTEGRATION_CATALOG.find(
      (item) => item.id === featured.id
    )
    if (!integration) {
      throw new Error(`Missing featured integration: ${featured.id}`)
    }
    return {
      id: featured.id,
      labelKey: featured.labelKey,
      docPath: integration.docPath,
    }
  }
)
