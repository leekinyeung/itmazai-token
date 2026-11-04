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

export function HomeSetup(props: { fallbackMarkers?: boolean } = {}) {
  const { t } = useTranslation()
  const steps = [
    ['Create your account', 'Register or sign in to open your console.'],
    [
      'Create an API key',
      'Give your application a dedicated key in the key manager.',
    ],
    [
      'Connect your tools',
      'Configure the API address and key in your client or SDK.',
    ],
    ['Follow your usage', 'View requests and consumption in the usage logs.'],
  ] as const
  return (
    <section
      className='home-setup home-container home-section'
      aria-labelledby='home-setup-title'
    >
      <p
        className='home-eyebrow'
        data-fallback-i18n={
          props.fallbackMarkers ? 'FROM IDEA TO YOUR FIRST REQUEST' : undefined
        }
      >
        {t('FROM IDEA TO YOUR FIRST REQUEST')}
      </p>
      <h2
        id='home-setup-title'
        data-fallback-i18n={
          props.fallbackMarkers
            ? 'Four steps. One connected workflow.'
            : undefined
        }
      >
        {t('Four steps. One connected workflow.')}
      </h2>
      <p
        className='home-section-description'
        data-fallback-i18n={
          props.fallbackMarkers
            ? 'Start with the tools you know. Keep every request in view.'
            : undefined
        }
      >
        {t('Start with the tools you know. Keep every request in view.')}
      </p>
      <ol className='home-step-grid'>
        {steps.map(([titleKey, descriptionKey], index) => (
          <li key={titleKey}>
            <div className='home-step-preview' aria-hidden='true'>
              <span
                className='home-preview-label'
                data-fallback-i18n={
                  props.fallbackMarkers ? 'Example only' : undefined
                }
              >
                {t('Example only')}
              </span>
              {index === 0 && (
                <>
                  <div
                    className='home-preview-heading'
                    data-fallback-i18n={
                      props.fallbackMarkers ? 'Your console' : undefined
                    }
                  >
                    {t('Your console')}
                  </div>
                  <div
                    className='home-preview-field'
                    data-fallback-i18n={
                      props.fallbackMarkers ? 'Account' : undefined
                    }
                  >
                    {t('Account')}
                  </div>
                  <div className='home-preview-field'>••••••••••••</div>
                  <div
                    className='home-preview-action'
                    data-fallback-i18n={
                      props.fallbackMarkers ? 'Ready to connect' : undefined
                    }
                  >
                    {t('Ready to connect')}
                  </div>
                </>
              )}
              {index === 1 && (
                <>
                  <div
                    className='home-preview-heading'
                    data-fallback-i18n={
                      props.fallbackMarkers ? 'API keys' : undefined
                    }
                  >
                    {t('API keys')}
                  </div>
                  <div className='home-preview-key'>
                    my-app<span>sk-••••••••••••</span>
                  </div>
                  <div
                    className='home-preview-tag'
                    data-fallback-i18n={
                      props.fallbackMarkers ? 'Application key' : undefined
                    }
                  >
                    {t('Application key')}
                  </div>
                </>
              )}
              {index === 2 && (
                <pre>
                  <code>
                    {
                      'from openai import OpenAI\n\nclient = OpenAI(\n  base_url=API_BASE_URL,\n  api_key=API_KEY\n)'
                    }
                  </code>
                </pre>
              )}
              {index === 3 && (
                <>
                  <div
                    className='home-preview-heading'
                    data-fallback-i18n={
                      props.fallbackMarkers ? 'Usage logs' : undefined
                    }
                  >
                    {t('Usage logs')}
                  </div>
                  {['chat/completions', 'messages', 'models'].map((path) => (
                    <div className='home-preview-log' key={path}>
                      <span>/{path}</span>
                      <span>200</span>
                    </div>
                  ))}
                </>
              )}
            </div>
            <div className='home-step-copy'>
              <span className='home-step-number'>{`0${index + 1}`}</span>
              <h3
                data-fallback-i18n={
                  props.fallbackMarkers ? titleKey : undefined
                }
              >
                {t(titleKey)}
              </h3>
              <p
                data-fallback-i18n={
                  props.fallbackMarkers ? descriptionKey : undefined
                }
              >
                {t(descriptionKey)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
