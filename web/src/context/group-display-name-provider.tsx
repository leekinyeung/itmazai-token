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
import { createContext, useCallback, useContext, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { useStatus } from '@/hooks/use-status'
import {
  formatGroupDisplayName,
  normalizeGroupDisplayNames,
  type GroupDisplayNames,
} from '@/lib/group-display-name'

const GroupDisplayNameContext = createContext<GroupDisplayNames>({})

export function GroupDisplayNameProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { status } = useStatus()
  const displayNames = useMemo<GroupDisplayNames>(() => {
    return normalizeGroupDisplayNames(status?.group_display_names)
  }, [status])

  return (
    <GroupDisplayNameContext value={displayNames}>
      {children}
    </GroupDisplayNameContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGroupDisplayName() {
  const displayNames = useContext(GroupDisplayNameContext)
  const { i18n } = useTranslation()
  const language = i18n.resolvedLanguage || i18n.language

  return useCallback(
    (group: string, showIdentifier = false) =>
      formatGroupDisplayName(group, displayNames, language, showIdentifier),
    [displayNames, language]
  )
}
