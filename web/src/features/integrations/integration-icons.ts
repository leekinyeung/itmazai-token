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
import type { AriaAttributes, ComponentType } from 'react'

import type { IntegrationIconName } from './catalog'

export type IntegrationIconComponent = ComponentType<{
  'aria-hidden'?: AriaAttributes['aria-hidden']
  className?: string
  size?: number | string
}>

const ICONS: Partial<Record<IntegrationIconName, IntegrationIconComponent>> = {
  'cherry-studio': CherryStudioIcon,
  'open-webui': OpenWebUIIcon,
  'openai-sdk': Code2,
}

const INITIALS: Record<IntegrationIconName, string> = {
  'cherry-studio': 'C',
  workbuddy: 'W',
  'open-webui': 'O',
  aionui: 'A',
  deepchat: 'D',
  'openai-sdk': 'SDK',
}

export function getIntegrationIcon(
  icon: IntegrationIconName
): IntegrationIconComponent | undefined {
  return ICONS[icon]
}

export function getIntegrationInitials(icon: IntegrationIconName): string {
  return INITIALS[icon]
}
