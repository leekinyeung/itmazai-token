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
import { ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ModelPriceCell } from '@/features/pricing/components/model-price-cell'
import type { usePricingData } from '@/features/pricing/hooks/use-pricing-data'
import { getLobeIcon } from '@/lib/lobe-icon'

export function HomeModelPrices(props: {
  pricing: ReturnType<typeof usePricingData>
}) {
  const { t } = useTranslation()
  const pricing = props.pricing
  const models = pricing.models.filter((model) => model.model_name.trim())
  const browse = (
    <Button
      variant='link'
      className='home-text-link'
      render={<Link to='/models' />}
    >
      {t('Browse all models and pricing')}
      <HugeiconsIcon icon={ArrowRight01Icon} size={15} aria-hidden='true' />
    </Button>
  )
  let modelPrices
  if (pricing.isLoading) {
    modelPrices = (
      <div
        className='home-price-loading'
        role='status'
        aria-label={t('Loading models')}
      >
        <span className='sr-only'>{t('Loading models')}</span>
        {[0, 1, 2, 3].map((row) => (
          <Skeleton key={row} className='h-14 w-full' />
        ))}
      </div>
    )
  } else if (pricing.error) {
    modelPrices = (
      <ErrorState
        title={t('Model prices are temporarily unavailable.')}
        action={browse}
        className='min-h-48'
      />
    )
  } else if (!models.length) {
    modelPrices = (
      <EmptyState
        title={t('No models are available yet.')}
        action={browse}
        className='min-h-48'
      />
    )
  } else {
    modelPrices = (
      <>
        <ul aria-label={t('Current model prices')} className='home-price-list'>
          {models.slice(0, 4).map((model) => (
            <li key={model.model_name}>
              <div className='home-price-model'>
                {(model.icon || model.vendor_icon) && (
                  <span className='home-price-model-icon' aria-hidden='true'>
                    {getLobeIcon(model.icon || model.vendor_icon, 18)}
                  </span>
                )}
                <div className='home-price-model-identity'>
                  <Link
                    to='/models/$modelId'
                    params={{ modelId: model.model_name }}
                  >
                    {model.model_name}
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      size={14}
                      aria-hidden='true'
                    />
                  </Link>
                  {model.vendor_name && <span>{model.vendor_name}</span>}
                </div>
              </div>
              <div className='home-price-value'>
                <ModelPriceCell
                  model={model}
                  showExpression={false}
                  options={{
                    priceRate: pricing.priceRate,
                    usdExchangeRate: pricing.usdExchangeRate,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
        {browse}
      </>
    )
  }
  return (
    <div className='home-price-panel'>
      <div className='home-panel-label'>
        {t('Current model prices')}
        <span>{t('Standard price')}</span>
      </div>
      {modelPrices}
    </div>
  )
}
