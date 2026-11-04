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
import { Link } from '@tanstack/react-router'
import { ArrowRight, Pause, Play } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { FeaturedIntegrationGuides } from '@/features/integrations/featured-integration-guides'
import { IntegrationMark } from '@/features/integrations/integration-mark'

import { HOME_CLIENTS } from '../home-clients'
import { HOME_PROVIDERS } from '../model-providers'

export function HomeEcosystem(props: {
  paused: boolean
  onPausedChange: (paused: boolean) => void
}) {
  const { t } = useTranslation()
  return (
    <section
      className='home-ecosystem home-container'
      aria-labelledby='home-ecosystem-title'
      data-paused={props.paused}
    >
      <div className='home-ecosystem-heading'>
        <h2 id='home-ecosystem-title' className='home-eyebrow'>
          {t('AT HOME IN YOUR AI TOOLKIT')}
        </h2>
        <Button
          variant='ghost'
          size='sm'
          className='home-motion-toggle'
          aria-pressed={props.paused}
          onClick={() => props.onPausedChange(!props.paused)}
        >
          {props.paused ? (
            <Play size={14} aria-hidden='true' />
          ) : (
            <Pause size={14} aria-hidden='true' />
          )}
          {props.paused ? t('Resume animations') : t('Pause animations')}
        </Button>
      </div>
      <div className='home-marquee' aria-label={t('Model providers')}>
        <div className='home-marquee-track'>
          {[0, 1].map((copy) => (
            <div
              className='home-logo-row'
              key={copy}
              aria-hidden={copy === 1 ? true : undefined}
            >
              {HOME_PROVIDERS.map((provider) => (
                <span key={provider.name}>
                  <provider.icon size={26} aria-hidden='true' />
                  {provider.name}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div
        className='home-marquee home-marquee-reverse'
        aria-label={t('Compatible clients')}
      >
        <div className='home-marquee-track'>
          {[0, 1].map((copy) => (
            <div
              className='home-logo-row'
              key={copy}
              aria-hidden={copy === 1 ? true : undefined}
            >
              {HOME_CLIENTS.map((client) => (
                <span key={client.name}>
                  <IntegrationMark
                    icon={client.icon}
                    className='home-client-symbol'
                  />
                  {client.name}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <FeaturedIntegrationGuides
        id='home-integration-guides'
        headingLevel='h3'
      />
      <div className='mt-4 flex flex-wrap gap-x-5 gap-y-2'>
        <Button
          variant='link'
          className='home-text-link'
          render={<Link to='/integrations' />}
        >
          {t('Explore integrations')}
          <ArrowRight size={15} aria-hidden='true' />
        </Button>
        <Button
          variant='link'
          className='home-text-link'
          render={<Link to='/models' />}
        >
          {t('Browse all models and pricing')}
          <ArrowRight size={15} aria-hidden='true' />
        </Button>
      </div>
    </section>
  )
}
