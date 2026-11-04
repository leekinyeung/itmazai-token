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
import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'
import { toIntlLocale } from '@/i18n/languages'

import '@/styles/home.css'

import { HomeHero } from './home-hero'

const LazyHomeLivePreview = lazy(async () => {
  const { HomeLivePreview } = await import('./home-live-preview')
  return { default: HomeLivePreview }
})
const LazyHomeEcosystem = lazy(async () => {
  const { HomeEcosystem } = await import('./home-ecosystem')
  return { default: HomeEcosystem }
})
const LazyHomeCapabilities = lazy(async () => {
  const { HomeCapabilities } = await import('./home-capabilities')
  return { default: HomeCapabilities }
})
const LazyHomeSetup = lazy(async () => {
  const { HomeSetup } = await import('./home-setup')
  return { default: HomeSetup }
})

function DeferredHomeSection(props: {
  children: ReactNode
  placeholderHeight: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(
    () => typeof IntersectionObserver === 'undefined'
  )

  useEffect(() => {
    if (visible) return
    const container = containerRef.current
    if (!container) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        setVisible(true)
        observer.disconnect()
      },
      { rootMargin: '0px' }
    )
    observer.observe(container)
    return () => observer.disconnect()
  }, [visible])

  return (
    <div
      ref={containerRef}
      data-home-deferred={visible ? 'visible' : 'pending'}
      style={
        visible
          ? { display: 'contents' }
          : { minHeight: props.placeholderHeight }
      }
    >
      {visible ? <Suspense fallback={null}>{props.children}</Suspense> : null}
    </div>
  )
}

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
        render={<Link to='/models' />}
      >
        {t('Browse all models and pricing')}
      </Button>
    </div>
  )
}

export function HomeLanding(props: { isAuthenticated: boolean }) {
  const { t, i18n } = useTranslation()
  const [animationsPaused, setAnimationsPaused] = useState(false)
  const [modelCount, setModelCount] = useState<number>()
  const { status } = useStatus()
  const { systemName, logo } = useSystemConfig()
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
        modelCount={modelCount}
        paused={animationsPaused}
      />
      <DeferredHomeSection placeholderHeight='44rem'>
        <LazyHomeLivePreview
          apiBaseUrl={apiBaseUrl}
          onModelCountChange={setModelCount}
        />
      </DeferredHomeSection>
      <DeferredHomeSection placeholderHeight='34rem'>
        <LazyHomeEcosystem
          paused={animationsPaused}
          onPausedChange={setAnimationsPaused}
        />
      </DeferredHomeSection>
      <DeferredHomeSection placeholderHeight='68rem'>
        <LazyHomeCapabilities apiBaseUrl={apiBaseUrl} docsUrl={docsUrl} />
      </DeferredHomeSection>
      <DeferredHomeSection placeholderHeight='48rem'>
        <LazyHomeSetup />
      </DeferredHomeSection>
      <DeferredHomeSection placeholderHeight='24rem'>
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
      </DeferredHomeSection>
    </main>
  )
}
