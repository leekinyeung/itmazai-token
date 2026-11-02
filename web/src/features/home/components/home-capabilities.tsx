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
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { getEndpointTypeLabels } from '@/features/pricing/constants'
import type { PricingModel } from '@/features/pricing/types'
import { toIntlLocale } from '@/i18n/languages'
import { formatNumber } from '@/lib/format'

export function HomeCapabilities(props: {
  apiBaseUrl: string
  models: PricingModel[]
  endpointMap: Record<string, unknown>
  docsUrl: string
}) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const protocolLabels: Record<string, string> = {
    ...getEndpointTypeLabels(t),
    openai: 'OpenAI',
    'openai-response': 'OpenAI Responses',
  }
  const capabilities = [
    [
      t('Multi-provider routing'),
      t(
        'Connect configured channels and route requests across the models available to your group.'
      ),
    ],
    [
      t('API key management'),
      t(
        'Create dedicated keys for your apps and manage their access and quotas.'
      ),
    ],
    [
      t('Usage and request logs'),
      t(
        'Inspect request history, token usage and consumption in your console.'
      ),
    ],
    [
      t('Clear, model-based billing'),
      t('Compare token, request and dynamic prices before choosing a model.'),
    ],
    [
      t('A familiar integration'),
      t('Set your base URL and API key in a compatible client or SDK.'),
    ],
    [
      t('Streaming and tool calls'),
      t(
        'Build responsive AI experiences with the capabilities supported by each model.'
      ),
    ],
    [
      t('Multiple API protocols'),
      t('Choose the endpoint format supported by your model and application.'),
    ],
    [
      t('A model square to explore'),
      t(
        'Find model details, supported endpoints and current prices in one place.'
      ),
    ],
  ]
  const enabledTypes = new Set(
    props.models.flatMap((model) => model.supported_endpoint_types ?? [])
  )
  const endpoints = Object.entries(props.endpointMap).flatMap(
    ([name, value]) => {
      if (
        !enabledTypes.has(name) ||
        !value ||
        typeof value !== 'object' ||
        !('path' in value) ||
        typeof value.path !== 'string'
      ) {
        return []
      }
      return [
        {
          name,
          path: value.path,
          count: props.models.filter((model) =>
            model.supported_endpoint_types?.includes(name)
          ).length,
          method:
            'method' in value && typeof value.method === 'string'
              ? value.method
              : 'POST',
        },
      ]
    }
  )
  return (
    <section
      className='home-capabilities home-container home-section'
      aria-labelledby='home-capabilities-title'
    >
      <div>
        <p className='home-eyebrow'>{t('BUILT INTO YOUR GATEWAY')}</p>
        <h2 id='home-capabilities-title'>
          {t('Send the request. Let the gateway handle the rest.')}
        </h2>
        <p className='home-section-description'>
          {t(
            'From access and routing to usage and billing. Everything you need to connect your AI applications.'
          )}
        </p>
        <Accordion defaultValue={['0']} className='home-capability-list'>
          {capabilities.map(([title, description], index) => (
            <AccordionItem key={title} value={String(index)}>
              <AccordionTrigger>
                <span className='home-capability-number'>{`0${index + 1}`}</span>
                <span>{title}</span>
              </AccordionTrigger>
              <AccordionContent>
                <p>{description}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
      <div className='home-protocol-panel'>
        <h3>{t('Endpoints & protocols')}</h3>
        <div className='home-base-url'>
          <span>{t('Base URL')}</span>
          <code>{props.apiBaseUrl}</code>
          <CopyButton
            value={props.apiBaseUrl}
            aria-label={t('Copy API base URL')}
          />
        </div>
        <p className='home-protocol-auth'>
          {t('Authorization')}: <code>Bearer · API Key</code>
        </p>
        {endpoints.map((endpoint) => (
          <div className='home-protocol' key={endpoint.name}>
            <h4>{protocolLabels[endpoint.name] ?? endpoint.name}</h4>
            <p className='home-protocol-model-count'>
              {t(
                endpoint.count === 1
                  ? '{{formattedCount}} compatible model'
                  : '{{formattedCount}} compatible models',
                { formattedCount: formatNumber(endpoint.count, locale) }
              )}
            </p>
            <dl>
              <div>
                <dt>{t('Method')}</dt>
                <dd>{endpoint.method}</dd>
              </div>
              <div>
                <dt>{t('Endpoint')}</dt>
                <dd>
                  <code>{endpoint.path}</code>
                </dd>
              </div>
            </dl>
          </div>
        ))}
        <div className='home-protocol'>
          <h4>{t('Model list')}</h4>
          <dl>
            <div>
              <dt>{t('Method')}</dt>
              <dd>GET</dd>
            </div>
            <div>
              <dt>{t('Endpoint')}</dt>
              <dd>
                <code>/v1/models</code>
              </dd>
            </div>
          </dl>
        </div>
        <p className='home-fine-print'>
          {t(
            'Only endpoints advertised by the current catalog are shown. Check model details for supported parameters.'
          )}
        </p>
        <Button
          variant='link'
          className='home-text-link'
          render={
            /^https?:\/\//.test(props.docsUrl) ? (
              <a
                href={props.docsUrl}
                target='_blank'
                rel='noopener noreferrer'
              />
            ) : (
              <Link to={props.docsUrl} />
            )
          }
        >
          {t('Integration guide')}
        </Button>
      </div>
    </section>
  )
}
