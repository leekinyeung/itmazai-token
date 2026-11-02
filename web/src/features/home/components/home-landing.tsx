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
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { usePricingData } from '@/features/pricing/hooks/use-pricing-data'
import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'
import { toIntlLocale } from '@/i18n/languages'

import { HomeCapabilities } from './home-capabilities'
import { HomeEcosystem } from './home-ecosystem'
import { HomeHero } from './home-hero'
import { HomeLivePreview } from './home-live-preview'
import { HomeSetup } from './home-setup'

import '@/styles/home.css'

function HomeActions(props: { isAuthenticated: boolean }) {
  const { t } = useTranslation()
  return (
    <div className='home-actions'>
      <Button
        className='home-primary-action'
        render={
          props.isAuthenticated ? (
            <Link to='/keys' />
          ) : (
            <Link to='/sign-in' search={{ redirect: '/keys' }} />
          )
        }
      >
        {t('Get an API key')}
        <HugeiconsIcon icon={ArrowRight01Icon} size={16} aria-hidden='true' />
      </Button>
      <Button
        variant='outline'
        className='home-secondary-action'
        render={<Link to='/pricing' />}
      >
        {t('Browse all models and pricing')}
      </Button>
    </div>
  )
}

export function HomeLanding(props: { isAuthenticated: boolean }) {
  const { t, i18n } = useTranslation()
  const [animationsPaused, setAnimationsPaused] = useState(false)
  const { status } = useStatus()
  const { systemName, logo } = useSystemConfig()
  const pricing = usePricingData()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const serverAddress =
    typeof status?.server_address === 'string' && status.server_address.trim()
      ? status.server_address.trim()
      : window.location.origin
  const apiBaseUrl = `${serverAddress.replace(/\/+$/, '').replace(/\/v1$/, '')}/v1`
  const docsUrl =
    typeof status?.docs_link === 'string' && status.docs_link.trim()
      ? status.docs_link.trim()
      : 'https://docs.taodock.com'

  return (
    <main
      className='home-main'
      aria-labelledby='home-title'
      lang={locale}
      data-animations-paused={animationsPaused}
    >
      <HomeHero
        brand={systemName}
        logo={logo}
        docsUrl={docsUrl}
        modelCount={
          pricing.isLoading || pricing.error ? undefined : pricing.models.length
        }
        paused={animationsPaused}
      />
      <HomeLivePreview pricing={pricing} apiBaseUrl={apiBaseUrl} />
      <HomeEcosystem
        paused={animationsPaused}
        onPausedChange={setAnimationsPaused}
      />
      <HomeCapabilities
        apiBaseUrl={apiBaseUrl}
        models={pricing.models}
        endpointMap={pricing.endpointMap}
        docsUrl={docsUrl}
      />
      <HomeSetup />
      <section
        className='home-cta home-container'
        aria-labelledby='home-cta-title'
      >
        <p className='home-eyebrow'>{systemName}</p>
        <h2 id='home-cta-title'>
          {t('Your next idea starts with one connection.')}
        </h2>
        <p>
          {t('Choose a model. Create a key. Build something that matters.')}
        </p>
        <HomeActions isAuthenticated={props.isAuthenticated} />
      </section>
    </main>
  )
}
