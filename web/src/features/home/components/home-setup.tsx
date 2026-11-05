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

export function HomeSetup() {
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
      <p className='home-eyebrow'>{t('FROM IDEA TO YOUR FIRST REQUEST')}</p>
      <h2 id='home-setup-title'>{t('Four steps. One connected workflow.')}</h2>
      <p className='home-section-description'>
        {t('Start with the tools you know. Keep every request in view.')}
      </p>
      <ol className='home-step-grid'>
        {steps.map(([titleKey, descriptionKey], index) => (
          <li key={titleKey}>
            <div className='home-step-preview' aria-hidden='true'>
              <span className='home-preview-label'>{t('Example only')}</span>
              {index === 0 && (
                <>
                  <div className='home-preview-heading'>
                    {t('Your console')}
                  </div>
                  <div className='home-preview-field'>{t('Account')}</div>
                  <div className='home-preview-field'>••••••••••••</div>
                  <div className='home-preview-action'>
                    {t('Ready to connect')}
                  </div>
                </>
              )}
              {index === 1 && (
                <>
                  <div className='home-preview-heading'>{t('API keys')}</div>
                  <div className='home-preview-key'>
                    my-app<span>sk-••••••••••••</span>
                  </div>
                  <div className='home-preview-tag'>{t('Application key')}</div>
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
                  <div className='home-preview-heading'>{t('Usage logs')}</div>
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
              <h3>{t(titleKey)}</h3>
              <p>{t(descriptionKey)}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
