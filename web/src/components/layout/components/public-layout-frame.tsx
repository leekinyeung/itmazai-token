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
import type { ReactNode } from 'react'

interface PublicLayoutFrameProps {
  header: ReactNode
  footer?: ReactNode
  children: ReactNode
  showMainContainer?: boolean
}

// Keep the public page geometry available before routing and translations are ready.
export function PublicLayoutFrame(props: PublicLayoutFrameProps) {
  return (
    <div className='bg-background text-foreground relative flex min-h-svh flex-col overflow-x-clip'>
      {props.header}
      {props.showMainContainer !== false ? (
        <main className='container min-w-0 flex-1 px-4 py-6 pt-20 md:px-4'>
          {props.children}
        </main>
      ) : (
        <div className='flex min-w-0 flex-1 flex-col'>{props.children}</div>
      )}
      {props.footer}
    </div>
  )
}
