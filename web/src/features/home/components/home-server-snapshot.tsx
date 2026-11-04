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
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { FeaturedIntegrationGuides } from '@/features/integrations/featured-integration-guides'
import { IntegrationMark } from '@/features/integrations/integration-mark'

import { HOME_CLIENTS, HOME_GATEWAY_CLIENTS } from '../home-clients'
import { buildGatewayLayout } from '../home-gateway-layout'
import { HOME_PROVIDERS } from '../model-providers'
import { GatewayDiagram } from './home-gateway-diagram'
import { HomeHeroFrame } from './home-hero-frame'
import { HomeServerFooter, HomeServerHeader } from './home-server-layout'
import { HomeSetup } from './home-setup'

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

const CAPABILITIES = [
  [
    'Multi-provider routing',
    'Connect configured channels and route requests across the models available to your group.',
  ],
  [
    'API key management',
    'Create dedicated keys for your apps and manage their access and quotas.',
  ],
  [
    'Usage and request logs',
    'Inspect request history, token usage and consumption in your console.',
  ],
  [
    'Clear, model-based billing',
    'Compare token, request and dynamic prices before choosing a model.',
  ],
  [
    'A familiar integration',
    'Set your base URL and API key in a compatible client or SDK.',
  ],
  [
    'Streaming and tool calls',
    'Build responsive AI experiences with the capabilities supported by each model.',
  ],
  [
    'Multiple API protocols',
    'Choose the endpoint format supported by your model and application.',
  ],
  [
    'A model square to explore',
    'Find model details, supported endpoints and current prices in one place.',
  ],
] as const

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

function HomeServerLivePreview(props: { apiBaseUrl: string }) {
  const { t } = useTranslation()

  return (
    <section
      className='home-live home-container home-section'
      aria-labelledby='server-home-live-title'
    >
      <p className='home-eyebrow' data-fallback-i18n='YOUR FIRST API REQUEST'>
        {t('YOUR FIRST API REQUEST')}
      </p>
      <div className='home-live-grid'>
        <div className='home-live-intro'>
          <h2
            id='server-home-live-title'
            data-fallback-i18n='One cURL command. A world of models.'
          >
            {t('One cURL command. A world of models.')}
          </h2>
          <p
            className='home-section-description'
            data-fallback-i18n='Live models and prices from our model square. Add your API key to the example and connect with a familiar SDK.'
          >
            {t(
              'Live models and prices from our model square. Add your API key to the example and connect with a familiar SDK.'
            )}
          </p>
          <div className='home-terminal'>
            <div className='home-terminal-bar'>
              <span className='home-terminal-dots' aria-hidden='true'>
                <i />
                <i />
                <i />
              </span>
              <span className='home-terminal-title'>API · cURL</span>
            </div>
            <pre className='home-server-code home-curl-code'>
              <code>
                curl &apos;
                <span data-server-api-models-url='true'>
                  {props.apiBaseUrl}/models
                </span>
                &apos; \{'\n  '}--header &quot;Authorization: Bearer
                $TAODOCK_API_KEY&quot;
              </code>
            </pre>
            <div className='home-terminal-response'>
              <span data-fallback-i18n='Example only'>{t('Example only')}</span>
              <code>GET /v1/models</code>
              <p data-fallback-i18n='Replace the key variable before running. This page does not send API requests on your behalf.'>
                {t(
                  'Replace the key variable before running. This page does not send API requests on your behalf.'
                )}
              </p>
            </div>
          </div>
        </div>
        <div className='home-live-prices'>
          <div className='home-price-panel'>
            <div className='home-panel-label'>
              <span data-fallback-i18n='Current model prices'>
                {t('Current model prices')}
              </span>
              <span data-fallback-i18n='Standard price'>
                {t('Standard price')}
              </span>
            </div>
            <div
              className='home-price-loading'
              role='status'
              aria-label={t('Loading models')}
              data-fallback-i18n-aria-label='Loading models'
            >
              {[0, 1, 2, 3].map((row) => (
                <Skeleton key={row} className='h-14 w-full' />
              ))}
            </div>
          </div>
          <p
            className='home-fine-print'
            data-fallback-i18n='Prices follow the model square currency and units. Availability and billing depend on the selected model and group.'
          >
            {t(
              'Prices follow the model square currency and units. Availability and billing depend on the selected model and group.'
            )}
          </p>
        </div>
      </div>
    </section>
  )
}

function HomeServerEcosystem() {
  const { t } = useTranslation()

  return (
    <section
      className='home-ecosystem home-container'
      aria-labelledby='server-home-ecosystem-title'
      data-paused='true'
    >
      <div className='home-ecosystem-heading'>
        <h2
          id='server-home-ecosystem-title'
          className='home-eyebrow'
          data-fallback-i18n='AT HOME IN YOUR AI TOOLKIT'
        >
          {t('AT HOME IN YOUR AI TOOLKIT')}
        </h2>
      </div>
      <div
        className='home-marquee'
        aria-label={t('Model providers')}
        data-fallback-i18n-aria-label='Model providers'
      >
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
        data-fallback-i18n-aria-label='Compatible clients'
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
        id='server-home-integration-guides'
        headingLevel='h3'
        fallbackMarkers
      />
      <div className='mt-4 flex flex-wrap gap-x-5 gap-y-2'>
        <Button
          variant='link'
          className='home-text-link'
          render={<a href='/integrations' />}
        >
          <span data-fallback-i18n='Explore integrations'>
            {t('Explore integrations')}
          </span>
          <ArrowRight size={15} aria-hidden='true' />
        </Button>
        <Button
          variant='link'
          className='home-text-link'
          render={<a href='/models' />}
        >
          <span data-fallback-i18n='Browse all models and pricing'>
            {t('Browse all models and pricing')}
          </span>
          <ArrowRight size={15} aria-hidden='true' />
        </Button>
      </div>
    </section>
  )
}

function HomeServerCapabilities(props: {
  apiBaseUrl: string
  docsUrl: string
}) {
  const { t } = useTranslation()

  return (
    <section
      className='home-capabilities home-container home-section'
      aria-labelledby='server-home-capabilities-title'
    >
      <div>
        <p
          className='home-eyebrow'
          data-fallback-i18n='BUILT INTO YOUR GATEWAY'
        >
          {t('BUILT INTO YOUR GATEWAY')}
        </p>
        <h2
          id='server-home-capabilities-title'
          data-fallback-i18n='Send the request. Let the gateway handle the rest.'
        >
          {t('Send the request. Let the gateway handle the rest.')}
        </h2>
        <p
          className='home-section-description'
          data-fallback-i18n='From access and routing to usage and billing. Everything you need to connect your AI applications.'
        >
          {t(
            'From access and routing to usage and billing. Everything you need to connect your AI applications.'
          )}
        </p>
        <div className='home-capability-list'>
          {CAPABILITIES.map(([titleKey, descriptionKey], index) => (
            <div data-slot='accordion-item' key={titleKey}>
              <div data-slot='accordion-trigger' aria-expanded={index === 0}>
                <span className='home-capability-number'>{`0${index + 1}`}</span>
                <span data-fallback-i18n={titleKey}>{t(titleKey)}</span>
              </div>
              {index === 0 && (
                <div data-slot='accordion-content'>
                  <p data-fallback-i18n={descriptionKey}>{t(descriptionKey)}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className='home-protocol-panel'>
        <h3 data-fallback-i18n='Endpoints & protocols'>
          {t('Endpoints & protocols')}
        </h3>
        <div className='home-base-url'>
          <span data-fallback-i18n='Base URL'>{t('Base URL')}</span>
          <code data-server-api-base='true'>{props.apiBaseUrl}</code>
        </div>
        <p className='home-protocol-auth'>
          <span data-fallback-i18n='Authorization'>{t('Authorization')}</span>:{' '}
          <code>Bearer · API Key</code>
        </p>
        <div className='home-protocol'>
          <h4 data-fallback-i18n='Model list'>{t('Model list')}</h4>
          <dl>
            <div>
              <dt data-fallback-i18n='Method'>{t('Method')}</dt>
              <dd>GET</dd>
            </div>
            <div>
              <dt data-fallback-i18n='Endpoint'>{t('Endpoint')}</dt>
              <dd>
                <code>/v1/models</code>
              </dd>
            </div>
          </dl>
        </div>
        <p
          className='home-fine-print'
          data-fallback-i18n='Only endpoints advertised by the current catalog are shown. Check model details for supported parameters.'
        >
          {t(
            'Only endpoints advertised by the current catalog are shown. Check model details for supported parameters.'
          )}
        </p>
        <Button
          variant='link'
          className='home-text-link'
          render={
            <a
              href={props.docsUrl}
              target='_blank'
              rel='noopener noreferrer'
              data-server-docs='true'
            />
          }
        >
          <span data-fallback-i18n='Integration guide'>
            {t('Integration guide')}
          </span>
        </Button>
      </div>
    </section>
  )
}

function HomeServerCta(props: { brand: string }) {
  const { t } = useTranslation()

  return (
    <section
      className='home-cta home-container'
      aria-labelledby='server-home-cta-title'
    >
      <p className='home-eyebrow' data-fallback-brand='true'>
        {props.brand}
      </p>
      <h2
        id='server-home-cta-title'
        data-fallback-i18n='Your next idea starts with one connection.'
      >
        {t('Your next idea starts with one connection.')}
      </h2>
      <p data-fallback-i18n='Choose a model. Create a key. Build something that matters.'>
        {t('Choose a model. Create a key. Build something that matters.')}
      </p>
      <div className='home-actions'>
        <Button
          className='home-primary-action'
          render={<a href='/sign-in?redirect=%2Fkeys' />}
        >
          <span data-fallback-i18n='Get an API key'>{t('Get an API key')}</span>
          <HugeiconsIcon icon={ArrowRight01Icon} size={16} aria-hidden='true' />
        </Button>
        <Button
          variant='outline'
          className='home-secondary-action'
          render={<a href='/models' />}
        >
          <span data-fallback-i18n='Browse all models and pricing'>
            {t('Browse all models and pricing')}
          </span>
        </Button>
      </div>
    </section>
  )
}

export function HomeServerSnapshot(props: {
  brand: string
  logo: string
  docsUrl: string
  apiBaseUrl: string
}) {
  const { t } = useTranslation()
  const audience = t('Built for {{audience}}', {
    audience: t('developers'),
  })

  return (
    <>
      <HomeServerHeader brand={props.brand} logo={props.logo} />
      <div className='flex min-w-0 flex-1 flex-col'>
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
                  render={<a href='/models' />}
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
                      href={props.docsUrl}
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
            <HomeServerLivePreview apiBaseUrl={props.apiBaseUrl} />
            <HomeServerEcosystem />
            <HomeServerCapabilities
              apiBaseUrl={props.apiBaseUrl}
              docsUrl={props.docsUrl}
            />
            <HomeSetup fallbackMarkers />
            <HomeServerCta brand={props.brand} />
          </main>
        </div>
      </div>
      <HomeServerFooter brand={props.brand} logo={props.logo} />
    </>
  )
}
