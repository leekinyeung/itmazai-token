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

import type { usePricingData } from '@/features/pricing/hooks/use-pricing-data'

import { HomeModelPrices } from './home-model-prices'
import { HomeRequestPreview } from './home-request-preview'

import '@/styles/home-live-preview.css'

export function HomeLivePreview(props: {
  pricing: ReturnType<typeof usePricingData>
  apiBaseUrl: string
}) {
  const { t } = useTranslation()
  const exampleModel =
    props.pricing.isLoading || props.pricing.error
      ? undefined
      : props.pricing.models.find(
          (model) =>
            model.model_name.trim() &&
            model.supported_endpoint_types?.includes('openai')
        )

  return (
    <section
      className='home-live home-container home-section'
      aria-labelledby='home-live-title'
    >
      <p className='home-eyebrow'>{t('YOUR FIRST API REQUEST')}</p>
      <div className='home-live-grid'>
        <div className='home-live-intro'>
          <h2 id='home-live-title'>
            {t('One cURL command. A world of models.')}
          </h2>
          <p className='home-section-description'>
            {t(
              'Live models and prices from our model square. Add your API key to the example and connect with a familiar SDK.'
            )}
          </p>
          <HomeModelPrices pricing={props.pricing} />
          <p className='home-fine-print'>
            {t(
              'Prices follow the model square currency and units. Availability and billing depend on the selected model and group.'
            )}
          </p>
        </div>
        <HomeRequestPreview
          apiBaseUrl={props.apiBaseUrl}
          modelName={exampleModel?.model_name}
        />
      </div>
    </section>
  )
}
