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
import { ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { FeaturedIntegrationGuides } from '@/features/integrations/featured-integration-guides'

import { HOME_GATEWAY_CLIENTS } from '../home-clients'
import { buildGatewayLayout } from '../home-gateway-layout'
import { HOME_PROVIDERS } from '../model-providers'
import { GatewayDiagram } from './home-gateway-diagram'
import { HomeHeroFrame } from './home-hero-frame'

const PROVIDERS = HOME_PROVIDERS.map((provider) => provider.name)
const CLIENTS = HOME_GATEWAY_CLIENTS.map((client) => client.name)
const DESKTOP_LAYOUT = buildGatewayLayout({
  mobile: false,
  providers: PROVIDERS,
  clients: CLIENTS,
  width: 1000,
})
const MOBILE_LAYOUT = buildGatewayLayout({
  mobile: true,
  providers: PROVIDERS,
  clients: CLIENTS,
})

function StaticIcon(props: { kind: 'language' | 'theme' | 'notification' }) {
  if (props.kind === 'language') {
    return <span aria-hidden='true'>文</span>
  }
  if (props.kind === 'theme') {
    return <span aria-hidden='true'>☼</span>
  }
  return <span aria-hidden='true'>○</span>
}

function HomeServerHeader(props: { brand: string; logo: string }) {
  const { t } = useTranslation()
  const links = [
    { module: 'home', title: 'Home', href: '/' },
    { module: 'console', title: 'Console', href: '/dashboard' },
    { module: 'pricing', title: 'Model Square', href: '/pricing' },
    { module: 'rankings', title: 'Rankings', href: '/rankings' },
    { module: 'docs', title: 'Docs', href: '__DOCS__', external: true },
  ]

  return (
    <header className='pointer-events-none fixed inset-x-0 top-0 z-50'>
      <div className='pointer-events-auto mx-auto max-w-7xl px-4 md:px-6'>
        <nav
          className='flex h-16 items-center justify-between gap-2 px-2'
          aria-label={t('Home')}
          data-fallback-i18n-aria-label='Home'
        >
          <div className='@container/system-brand flex min-w-0 flex-1 items-center gap-1 lg:min-w-36'>
            <a href='/' className='group flex min-w-0 items-center gap-2.5'>
              <div className='flex size-7 shrink-0 items-center justify-center'>
                <img
                  src={props.logo}
                  alt=''
                  className='size-full rounded-lg object-contain'
                  data-server-logo='true'
                />
              </div>
              <span
                className='max-w-48 truncate text-sm font-semibold tracking-tight'
                data-fallback-brand='true'
              >
                {props.brand}
              </span>
            </a>
          </div>

          <div className='hidden min-w-0 items-center gap-0.5 lg:flex'>
            {links.map((link) => (
              <a
                key={link.module}
                href={link.href}
                className={
                  link.module === 'home'
                    ? 'text-foreground min-w-0 truncate rounded-lg px-3 py-1.5 text-sm font-medium'
                    : 'text-muted-foreground hover:text-foreground min-w-0 truncate rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200'
                }
                data-server-nav={link.module}
                data-server-docs={link.module === 'docs' || undefined}
                target={link.external ? '_blank' : undefined}
                rel={link.external ? 'noopener noreferrer' : undefined}
              >
                <span data-fallback-i18n={link.title}>{t(link.title)}</span>
              </a>
            ))}
            <div className='bg-border/40 mx-2 h-4 w-px' />
            {(['language', 'theme', 'notification'] as const).map((kind) => (
              <span
                key={kind}
                className='text-muted-foreground flex size-8 items-center justify-center rounded-lg text-sm'
              >
                <StaticIcon kind={kind} />
              </span>
            ))}
            <div className='bg-border/40 mx-1 h-4 w-px' />
            <Button
              size='sm'
              className='h-8 rounded-lg px-3.5 text-xs font-medium'
              render={<a href='/sign-in' />}
            >
              <span data-fallback-i18n='Sign in'>{t('Sign in')}</span>
            </Button>
          </div>

          <div className='flex shrink-0 items-center gap-2 lg:hidden'>
            <span className='text-muted-foreground flex size-8 items-center justify-center rounded-lg text-sm'>
              <StaticIcon kind='theme' />
            </span>
            <span
              className='flex size-11 items-center justify-center'
              aria-label={t('Toggle navigation menu')}
              data-fallback-i18n-aria-label='Toggle navigation menu'
            >
              <span className='server-home-menu' aria-hidden='true' />
            </span>
          </div>
        </nav>
      </div>
    </header>
  )
}

function HomeServerGateway(props: { brand: string; logo: string }) {
  return (
    <div
      className='home-gateway'
      aria-hidden='true'
      data-motion='false'
      data-paused='true'
    >
      <GatewayDiagram
        namespace='server-home-desktop'
        layout={DESKTOP_LAYOUT}
        mobile={false}
        animated={false}
        reduced={false}
        logo={props.logo}
        brand={props.brand}
        svgRef={null}
        height={360}
        fallbackMarkers
      />
      <GatewayDiagram
        namespace='server-home-mobile'
        layout={MOBILE_LAYOUT}
        mobile
        animated={false}
        reduced={false}
        logo={props.logo}
        brand={props.brand}
        svgRef={null}
        fallbackMarkers
      />
    </div>
  )
}

export function HomeServerFrame(props: {
  brand: string
  logo: string
  custom?: boolean
}) {
  const { t } = useTranslation()
  const audience = t('Built for {{audience}}', {
    audience: t('developers'),
  })

  return (
    <div
      className='server-home-frame bg-background text-foreground relative flex min-h-svh flex-col overflow-x-clip'
      data-server-fallback='home'
      data-server-home-variant={props.custom ? 'custom' : 'default'}
      data-server-brand={props.brand}
    >
      <HomeServerHeader brand={props.brand} logo={props.logo} />
      {props.custom ? (
        <main
          className='server-home-loading flex min-h-svh flex-1 flex-col items-center justify-center gap-4 px-6 pt-16 text-center'
          aria-busy='true'
        >
          <img
            src={props.logo}
            alt=''
            className='size-14 rounded-xl object-contain'
            data-server-logo='true'
          />
          <p className='text-lg font-semibold' data-fallback-brand='true'>
            {props.brand}
          </p>
          <p
            className='text-muted-foreground text-sm'
            data-fallback-i18n='Loading...'
          >
            {t('Loading...')}
          </p>
        </main>
      ) : (
        <div className='home-page'>
          <main
            className='home-main'
            aria-labelledby='home-title'
            data-animations-paused='true'
          >
            <HomeHeroFrame
              brand={props.brand}
              fallbackMarkers
              audience={
                <span
                  className='home-audience'
                  aria-hidden='true'
                  data-fallback-i18n='Built for {{audience}}'
                  data-fallback-audience='developers'
                >
                  {audience}
                </span>
              }
              primaryAction={
                <Button
                  className='home-primary-action'
                  render={<a href='/pricing' />}
                >
                  <span data-fallback-i18n='Explore models'>
                    {t('Explore models')}
                  </span>
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    size={16}
                    aria-hidden='true'
                  />
                </Button>
              }
              secondaryAction={
                <Button
                  variant='outline'
                  className='home-secondary-action'
                  render={
                    <a
                      href='__DOCS__'
                      target='_blank'
                      rel='noopener noreferrer'
                      data-server-docs='true'
                    />
                  }
                >
                  <span data-fallback-i18n='Integration guide'>
                    {t('Integration guide')}
                  </span>
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    size={16}
                    aria-hidden='true'
                  />
                </Button>
              }
              gateway={
                <HomeServerGateway brand={props.brand} logo={props.logo} />
              }
            />
            <FeaturedIntegrationGuides
              id='server-home-integration-guides'
              headingLevel='h2'
              fallbackMarkers
            />
          </main>
        </div>
      )}
    </div>
  )
}
