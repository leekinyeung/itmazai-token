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

export function HomeServerFrame(props: { brand: string; logo: string }) {
  const { t } = useTranslation()

  return (
    <div
      className='server-home-frame'
      data-server-fallback='home'
      data-server-home-variant='loading'
      data-server-brand={props.brand}
    >
      <main className='server-home-loading' aria-busy='true'>
        <img
          src={props.logo}
          alt=''
          width={56}
          height={56}
          className='server-home-logo'
          data-server-logo='true'
        />
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
    </div>
  )
}
