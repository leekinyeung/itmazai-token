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
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useRouterState } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

export function DevelopmentTools() {
  const hidePanels = useRouterState({
    select: (state) =>
      state.matches.some((match) => match.routeId === '/(auth)'),
  })

  // Keep persisted overlays out of authentication forms.
  if (hidePanels) return null

  return (
    <>
      <ReactQueryDevtools buttonPosition='bottom-left' />
      {/* Keep the panel's reserved space out of the page layout. */}
      <div className='fixed inset-x-0 bottom-0 z-[99999]'>
        <TanStackRouterDevtools position='bottom-right' />
      </div>
    </>
  )
}
