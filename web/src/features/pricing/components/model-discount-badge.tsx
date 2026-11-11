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
import { useTranslation } from 'react-i18next'

import { StatusBadge } from '@/components/status-badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toIntlLocale } from '@/i18n/languages'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

import { getModelDiscount } from '../lib/model-helpers'
import type { PricingModel } from '../types'

export interface ModelDiscountBadgeProps {
  model: PricingModel
  appearance?: 'compact' | 'full' | 'savings'
  className?: string
}

export function ModelDiscountBadge(props: ModelDiscountBadgeProps) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const discount = getModelDiscount(props.model)
  const coefficient = formatNumber(discount, locale)
  const percent = formatNumber(discount * 100, locale)
  const savingsPercent = formatNumber((1 - discount) * 100, locale)
  const accessibleLabel = t('Model discount: {{coefficient}} / {{percent}}%', {
    coefficient,
    percent,
  })

  if (discount >= 1 && props.appearance !== 'full') {
    return props.appearance === 'savings' ? (
      <span className='text-muted-foreground/50 text-xs'>—</span>
    ) : null
  }

  const savingsLabel = t('Save {{percent}}%', { percent: savingsPercent })
  const showsSavings = props.appearance !== 'full'
  const visibleLabel = showsSavings
    ? `-${savingsPercent}%`
    : `${coefficient} / ${percent}%`
  const triggerLabel = showsSavings
    ? `${savingsLabel}. ${accessibleLabel}`
    : accessibleLabel

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            tabIndex={0}
            aria-label={triggerLabel}
            className='focus-visible:ring-ring/50 inline-flex shrink-0 rounded-full outline-none focus-visible:ring-2'
          />
        }
      >
        <StatusBadge
          label={visibleLabel}
          variant={discount < 1 ? 'success' : 'neutral'}
          copyable={false}
          size='sm'
          className={cn(
            'px-2 text-xs tabular-nums',
            discount < 1 ? 'bg-success/10' : 'bg-muted',
            props.className
          )}
        />
      </TooltipTrigger>
      <TooltipContent className='max-w-xs text-left'>
        <div className='space-y-1'>
          <p className='font-medium'>
            {showsSavings ? savingsLabel : accessibleLabel}
          </p>
          {showsSavings ? <p>{accessibleLabel}</p> : null}
          <p>
            {t(
              'Prices shown already include this model discount. Applicable group pricing is applied separately.'
            )}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
