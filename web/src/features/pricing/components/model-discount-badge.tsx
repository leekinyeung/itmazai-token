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
  const adjustmentPercent = formatNumber(Math.abs(1 - discount) * 100, locale)
  const accessibleLabel = t('Model discount: {{coefficient}} / {{percent}}%', {
    coefficient,
    percent,
  })

  if (discount === 1 && props.appearance !== 'full') {
    return props.appearance === 'savings' ? (
      <span className='text-muted-foreground/50 text-xs'>—</span>
    ) : null
  }

  const adjustmentLabel =
    discount < 1
      ? t('Save {{percent}}%', { percent: adjustmentPercent })
      : t('Price increase {{percent}}%', { percent: adjustmentPercent })
  const showsAdjustment = props.appearance !== 'full'
  const visibleLabel = showsAdjustment
    ? `${discount < 1 ? '-' : '+'}${adjustmentPercent}%`
    : `${coefficient} / ${percent}%`
  const triggerLabel = showsAdjustment
    ? `${adjustmentLabel}. ${accessibleLabel}`
    : accessibleLabel
  let badgeVariant: 'success' | 'warning' | 'neutral' = 'neutral'
  let badgeBackground = 'bg-muted'
  if (discount < 1) {
    badgeVariant = 'success'
    badgeBackground = 'bg-success/10'
  } else if (discount > 1) {
    badgeVariant = 'warning'
    badgeBackground = 'bg-warning/10'
  }

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
          variant={badgeVariant}
          copyable={false}
          size='sm'
          className={cn(
            'px-2 text-xs tabular-nums',
            badgeBackground,
            props.className
          )}
        />
      </TooltipTrigger>
      <TooltipContent className='max-w-xs text-left'>
        <div className='space-y-1'>
          <p className='font-medium'>
            {showsAdjustment ? adjustmentLabel : accessibleLabel}
          </p>
          {showsAdjustment ? <p>{accessibleLabel}</p> : null}
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
