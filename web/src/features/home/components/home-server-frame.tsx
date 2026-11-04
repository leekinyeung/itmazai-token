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
import { useTranslation } from 'react-i18next'

import { HomeServerSnapshot } from './home-server-snapshot'

export function HomeServerFrame(props: {
  brand: string
  logo: string
  docsUrl?: string
  apiBaseUrl?: string
  custom?: boolean
}) {
  const { t } = useTranslation()

  return (
    <div
      className={
        props.custom
          ? 'server-home-frame'
          : 'server-home-frame bg-background text-foreground relative flex min-h-svh flex-col overflow-x-clip'
      }
      data-server-fallback='home'
      data-server-home-variant={props.custom ? 'custom' : 'default'}
      data-server-brand={props.brand}
    >
      {props.custom ? (
        <main className='server-home-loading' aria-busy='true'>
          <div className='server-home-mark'>
            <div
              className='server-home-bloom'
              aria-hidden='true'
              data-server-home-bloom='true'
            >
              <span className='server-home-orbit server-home-orbit--blue' />
              <span className='server-home-orbit server-home-orbit--violet' />
              <span className='server-home-orbit server-home-orbit--pink' />
            </div>
            <div className='server-home-logo-shell'>
              <img
                src={props.logo}
                alt=''
                width={72}
                height={72}
                className='server-home-logo'
                data-server-logo='true'
              />
            </div>
          </div>
          <p className='server-home-brand' data-fallback-brand='true'>
            {props.brand}
          </p>
          <p
            className='server-home-message'
            role='status'
            aria-live='polite'
            data-fallback-i18n='Loading...'
          >
            {t('Loading...')}
          </p>
        </main>
      ) : (
        <HomeServerSnapshot
          brand={props.brand}
          logo={props.logo}
          docsUrl={props.docsUrl ?? '__DOCS__'}
          apiBaseUrl={props.apiBaseUrl ?? '__API_BASE__'}
        />
      )}
    </div>
  )
}
