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
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

type EvaluationPanelProps = {
  title: string
  icon: IconSvgElement
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function EvaluationPanel(props: EvaluationPanelProps) {
  return (
    <Card
      className={cn(
        'border-border/70 bg-card/85 min-h-[38rem] gap-0 py-0 shadow-sm backdrop-blur-sm lg:min-h-[43rem]',
        props.className
      )}
    >
      <CardHeader className='border-border/70 border-b px-5 py-5'>
        <CardTitle className='flex items-center gap-2.5 text-lg font-semibold'>
          <HugeiconsIcon
            icon={props.icon}
            aria-hidden='true'
            className='text-primary size-5'
            strokeWidth={2}
          />
          <h2>{props.title}</h2>
        </CardTitle>
        {props.action && <CardAction>{props.action}</CardAction>}
      </CardHeader>
      <CardContent className='flex flex-1 flex-col px-5 py-5'>
        {props.children}
      </CardContent>
    </Card>
  )
}
