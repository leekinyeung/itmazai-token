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

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { getIntegrationDocUrl } from './catalog'
import { FEATURED_INTEGRATION_GUIDES } from './featured-guides'

interface FeaturedIntegrationGuidesProps {
  id: string
  headingLevel: 'h2' | 'h3'
  className?: string
  fallbackMarkers?: boolean
}

export function FeaturedIntegrationGuides(
  props: FeaturedIntegrationGuidesProps
) {
  const { t, i18n } = useTranslation()
  const Heading = props.headingLevel

  return (
    <nav
      className={cn('home-integration-guides', props.className)}
      aria-labelledby={props.id}
    >
      <Heading
        id={props.id}
        className='home-integration-guides-title'
        data-fallback-i18n={
          props.fallbackMarkers ? 'Integration guides' : undefined
        }
      >
        {t('Integration guides')}
      </Heading>
      <ul>
        {FEATURED_INTEGRATION_GUIDES.map((guide) => (
          <li key={guide.id}>
            <Button
              variant='link'
              className='home-text-link'
              render={
                <a
                  href={getIntegrationDocUrl(
                    guide.docPath,
                    i18n.resolvedLanguage || i18n.language
                  )}
                  data-fallback-doc-path={
                    props.fallbackMarkers ? guide.docPath : undefined
                  }
                  target='_blank'
                  rel='noopener noreferrer'
                />
              }
            >
              <span
                data-fallback-i18n={
                  props.fallbackMarkers ? guide.labelKey : undefined
                }
              >
                {t(guide.labelKey)}
              </span>
            </Button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
