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
import CherryStudioIcon from '@lobehub/icons/es/CherryStudio/components/Color'
import OpenWebUIIcon from '@lobehub/icons/es/OpenWebUI/components/Mono'
import { Code2 } from 'lucide-react'

// Only clients covered by this deployment's integration documentation.
export const HOME_CLIENTS = [
  { name: 'Cherry Studio', icon: CherryStudioIcon, initials: '' },
  { name: 'WorkBuddy', initials: 'W' },
  { name: 'Open WebUI', icon: OpenWebUIIcon, initials: '' },
  { name: 'AionUi', initials: 'A' },
  { name: 'DeepChat', initials: 'D' },
  { name: 'OpenAI SDK', icon: Code2, initials: '' },
] as const

export const HOME_GATEWAY_CLIENTS = HOME_CLIENTS.filter(
  (client) => client.name !== 'WorkBuddy'
)
