/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { formatNumber } from '@/lib/format'

interface HomeHeroFrameProps {
  brand: string
  locale?: string
  modelCount?: number
  audience: ReactNode
  gateway: ReactNode
  primaryAction: ReactNode
  secondaryAction: ReactNode
  fallbackMarkers?: boolean
}

export function HomeHeroFrame(props: HomeHeroFrameProps) {
  const { t } = useTranslation()
  const marker = (key: string, brand = false) =>
    props.fallbackMarkers
      ? {
          'data-fallback-i18n': key,
          ...(brand ? { 'data-fallback-brand-value': 'true' } : {}),
        }
      : undefined

  return (
    <section className='home-hero' aria-labelledby='home-title'>
      <div className='home-hero-copy'>
        <p
          className='home-eyebrow home-hero-badge'
          {...marker('MODELS · API · POSSIBILITIES')}
        >
          {t('MODELS · API · POSSIBILITIES')}
        </p>
        <h1 id='home-title'>
          <span {...marker('One gateway, endless AI possibilities.')}>
            {t('One gateway, endless AI possibilities.')}
          </span>
          {props.audience}
        </h1>
        <p
          className='home-hero-description'
          {...marker(
            'Connect leading models through {{brand}}. One familiar API, from your first prototype to your next release.',
            true
          )}
        >
          {t(
            'Connect leading models through {{brand}}. One familiar API, from your first prototype to your next release.',
            { brand: props.brand }
          )}
        </p>
        <div className='home-actions'>
          {props.primaryAction}
          {props.secondaryAction}
        </div>
        <p
          className='home-hero-note'
          {...(!props.modelCount
            ? marker('Many models. One connection.')
            : undefined)}
        >
          {!props.modelCount
            ? t('Many models. One connection.')
            : t('{{formattedCount}} models, ready to explore.', {
                formattedCount: formatNumber(props.modelCount, props.locale),
              })}
        </p>
      </div>
      {props.gateway}
    </section>
  )
}
