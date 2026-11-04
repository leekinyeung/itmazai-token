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
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { toIntlLocale } from '@/i18n/languages'

import '@/styles/home-hero.css'

import { HomeAudience } from './home-audience'
import { HomeGateway } from './home-gateway'
import { HomeHeroFrame } from './home-hero-frame'

interface HomeHeroProps {
  brand: string
  logo: string
  docsUrl: string
  modelCount?: number
  paused: boolean
}

export function HomeHero(props: HomeHeroProps) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const audience = useMemo(() => {
    const words = [t('developers'), t('teams'), t('your next idea')]
    // Split the translated template so each language keeps its own word order.
    const parts = t('Built for {{audience}}', { audience: '\uFFFC' }).split(
      '\uFFFC'
    )
    if (parts.length !== 2) {
      return {
        words: words.map((word) =>
          t('Built for {{audience}}', { audience: word })
        ),
        prefix: '',
        suffix: '',
      }
    }
    return { words, prefix: parts[0], suffix: parts[1] }
  }, [t])

  const primaryAction = (
    <Button className='home-primary-action' render={<Link to='/models' />}>
      {t('Explore models')}
      <HugeiconsIcon icon={ArrowRight01Icon} size={16} aria-hidden='true' />
    </Button>
  )
  const secondaryAction = (
    <Button
      variant='outline'
      className='home-secondary-action'
      render={
        /^https?:\/\//.test(props.docsUrl) ? (
          <a href={props.docsUrl} target='_blank' rel='noopener noreferrer' />
        ) : (
          <Link to={props.docsUrl} />
        )
      }
    >
      {t('Integration guide')}
      <HugeiconsIcon icon={ArrowRight01Icon} size={16} aria-hidden='true' />
    </Button>
  )

  return (
    <HomeHeroFrame
      brand={props.brand}
      locale={locale}
      modelCount={props.modelCount}
      audience={
        <HomeAudience
          key={locale}
          words={audience.words}
          prefix={audience.prefix}
          suffix={audience.suffix}
          paused={props.paused}
        />
      }
      primaryAction={primaryAction}
      secondaryAction={secondaryAction}
      gateway={
        <HomeGateway
          logo={props.logo}
          brand={props.brand}
          paused={props.paused}
        />
      }
    />
  )
}
