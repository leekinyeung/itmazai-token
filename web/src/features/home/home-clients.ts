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
import { INTEGRATION_CATALOG } from '@/features/integrations/catalog'
import {
  getIntegrationIcon,
  getIntegrationInitials,
  type IntegrationIconComponent,
} from '@/features/integrations/integration-icons'

// Only clients covered by this deployment's integration documentation.
export const HOME_CLIENTS = INTEGRATION_CATALOG

type HomeGatewayClient =
  | { name: string; icon: IntegrationIconComponent }
  | { name: string; initials: string }

export const HOME_GATEWAY_CLIENTS: HomeGatewayClient[] = HOME_CLIENTS.filter(
  (client) => client.id !== 'workbuddy'
).map((client) => {
  const icon = getIntegrationIcon(client.icon)
  if (icon) return { name: client.name, icon }
  return { name: client.name, initials: getIntegrationInitials(client.icon) }
})
