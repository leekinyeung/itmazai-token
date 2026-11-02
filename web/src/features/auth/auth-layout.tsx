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
import { Home } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import modelEcosystemDark from '@/assets/auth/model-ecosystem-dark.webp'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useTheme } from '@/context/theme-provider'
import { useSystemConfig } from '@/hooks/use-system-config'
import { cn } from '@/lib/utils'

import '@/styles/auth.css'

type AuthLayoutProps = {
  children: React.ReactNode
  variant?: 'default' | 'split'
}

export function AuthLayout(props: AuthLayoutProps) {
  const { t } = useTranslation()
  const { systemName, logo, loading } = useSystemConfig()
  const { resolvedTheme } = useTheme()

  const brand = (
    <Link
      to='/'
      className={cn(
        'flex min-w-0 items-center gap-2.5 transition-opacity hover:opacity-80',
        props.variant === 'split'
          ? 'auth-brand'
          : 'absolute top-4 left-4 z-10 sm:top-8 sm:left-8'
      )}
    >
      <div className='relative size-8 shrink-0'>
        {loading ? (
          <Skeleton className='absolute inset-0 rounded-full' />
        ) : (
          <img
            src={logo}
            alt={t('Logo')}
            className='size-8 rounded-lg object-contain'
          />
        )}
      </div>
      {loading ? (
        <Skeleton className='h-6 w-24' />
      ) : (
        <span className='truncate text-xl font-semibold tracking-tight'>
          {systemName}
        </span>
      )}
    </Link>
  )

  if (props.variant === 'split') {
    return (
      <div className='auth-page'>
        <header className='auth-header'>
          {brand}
          <nav aria-label={t('Page controls')} className='auth-toolbar'>
            <Button
              variant='ghost'
              className='auth-home h-10 gap-2 px-2.5'
              render={<Link to='/' />}
            >
              <Home className='size-4' aria-hidden='true' />
              <span>{t('Back to Home')}</span>
            </Button>
            <Separator
              orientation='vertical'
              className='mx-1 h-4'
              aria-hidden='true'
            />
            <LanguageSwitcher showLabel />
            <ThemeSwitch />
          </nav>
        </header>

        <aside className='auth-brand-panel' aria-labelledby='auth-brand-title'>
          <div className='auth-brand-copy'>
            <h2 id='auth-brand-title' className='auth-brand-title'>
              <span>{t('One gateway,')}</span>
              <span className='auth-accent'>{t('Endless possibilities.')}</span>
            </h2>
            <p className='auth-brand-description'>
              {t('Connect leading AI models through one unified API.')}
            </p>
          </div>
          <img
            src={
              resolvedTheme === 'dark'
                ? modelEcosystemDark
                : '/images/home/model-ecosystem.png'
            }
            width={1715}
            height={917}
            alt=''
            aria-hidden='true'
            className='auth-brand-art'
            loading='lazy'
            decoding='async'
          />
        </aside>

        <main className='auth-form-area'>
          <div className='auth-form-content'>{props.children}</div>
        </main>
      </div>
    )
  }

  return (
    <div className='relative grid h-svh max-w-none'>
      {brand}
      <div className='container flex items-center pt-16 sm:pt-0'>
        <div className='mx-auto flex w-full flex-col justify-center space-y-2 px-4 py-8 sm:w-[480px] sm:p-8'>
          {props.children}
        </div>
      </div>
    </div>
  )
}
