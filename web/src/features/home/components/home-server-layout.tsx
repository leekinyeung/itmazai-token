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

import { footerLinkClassName } from '@/components/layout/components/footer-navigation'
import { Button } from '@/components/ui/button'
import { getIntegrationDocUrl } from '@/features/integrations/catalog'
import { FEATURED_INTEGRATION_GUIDES } from '@/features/integrations/featured-guides'

const HEADER_LINKS = [
  { module: 'home', title: 'Home', href: '/' },
  { module: 'console', title: 'Console', href: '/dashboard' },
  { module: 'pricing', title: 'Model Square', href: '/models' },
  {
    module: 'model-evaluation',
    title: 'Model Evaluation',
    href: '/model-evaluation',
  },
  { module: 'rankings', title: 'Rankings', href: '/rankings' },
  { module: 'docs', title: 'Docs', href: '__DOCS__' },
] as const

function StaticHeaderIcon(props: {
  kind: 'language' | 'theme' | 'notification'
}) {
  if (props.kind === 'language') {
    return <span aria-hidden='true'>文</span>
  }
  if (props.kind === 'theme') {
    return <span aria-hidden='true'>☼</span>
  }
  return <span aria-hidden='true'>○</span>
}

export function HomeServerHeader(props: { brand: string; logo: string }) {
  const { t } = useTranslation()

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
            {HEADER_LINKS.map((link) => (
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
                target={link.module === 'docs' ? '_blank' : undefined}
                rel={link.module === 'docs' ? 'noopener noreferrer' : undefined}
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
                <StaticHeaderIcon kind={kind} />
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
              <StaticHeaderIcon kind='theme' />
            </span>
            <span className='flex size-11 items-center justify-center'>
              <span className='server-home-menu' aria-hidden='true' />
            </span>
          </div>
        </nav>
      </div>
    </header>
  )
}

export function HomeServerFooter(props: { brand: string; logo: string }) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage || i18n.language

  return (
    <footer className='border-border bg-background text-foreground relative shrink-0 border-t'>
      <div className='mx-auto w-full max-w-7xl px-6 md:px-8'>
        <div className='flex flex-col gap-10 py-12 lg:flex-row lg:gap-12 lg:py-16'>
          <div className='min-w-0 lg:flex-[2]'>
            <a href='/' className={`${footerLinkClassName} gap-2.5`}>
              <img
                src={props.logo}
                alt=''
                className='size-7 shrink-0 rounded-lg object-contain'
                data-server-logo='true'
              />
              <span
                className='text-base font-semibold tracking-tight wrap-anywhere'
                data-fallback-brand='true'
              >
                {props.brand}
              </span>
            </a>
            <p
              className='text-muted-foreground mt-3 max-w-sm text-sm leading-6 wrap-anywhere'
              data-fallback-i18n='One API, many AI capabilities.'
            >
              {t('One API, many AI capabilities.')}
            </p>
            <p
              className='text-muted-foreground mt-1 max-w-sm text-sm leading-6 wrap-anywhere'
              data-fallback-i18n='For developers and AI users'
            >
              {t('For developers and AI users')}
            </p>
          </div>

          <nav
            aria-label={t('Footer navigation')}
            data-fallback-i18n-aria-label='Footer navigation'
            className='grid min-w-0 flex-grow grid-cols-2 gap-x-12 gap-y-8 lg:basis-0 lg:grid-cols-4'
          >
            <div className='min-w-0'>
              <h2
                className='mb-2 text-sm leading-6 font-semibold wrap-anywhere'
                data-fallback-i18n='Products'
              >
                {t('Products')}
              </h2>
              <ul>
                {[
                  ['pricing', 'Model Square', '/models'],
                  ['rankings', 'Rankings', '/rankings'],
                  ['console', 'Console', '/dashboard'],
                ].map(([module, label, href]) => (
                  <li
                    key={module}
                    className='text-muted-foreground text-sm leading-6'
                    data-server-nav={module}
                  >
                    <a href={href} className={footerLinkClassName}>
                      <span data-fallback-i18n={label}>{t(label)}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className='min-w-0'>
              <h2
                className='mb-2 text-sm leading-6 font-semibold wrap-anywhere'
                data-fallback-i18n='Documentation'
              >
                {t('Documentation')}
              </h2>
              <ul>
                <li
                  className='text-muted-foreground text-sm leading-6'
                  data-server-nav='docs'
                >
                  <a
                    href='__DOCS__'
                    target='_blank'
                    rel='noopener noreferrer'
                    className={footerLinkClassName}
                    data-server-docs='true'
                  >
                    <span data-fallback-i18n='Developer documentation'>
                      {t('Developer documentation')}
                    </span>
                  </a>
                </li>
                <li className='text-muted-foreground text-sm leading-6'>
                  <a href='/integrations' className={footerLinkClassName}>
                    <span data-fallback-i18n='Integrations'>
                      {t('Integrations')}
                    </span>
                  </a>
                </li>
                <li className='text-muted-foreground text-sm leading-6'>
                  <a href='/compare' className={footerLinkClassName}>
                    <span data-fallback-i18n='AI gateway comparisons'>
                      {t('AI gateway comparisons')}
                    </span>
                  </a>
                </li>
                <li className='text-muted-foreground text-sm leading-6'>
                  <a href='/faq' className={footerLinkClassName}>
                    <span data-fallback-i18n='Frequently asked questions'>
                      {t('Frequently asked questions')}
                    </span>
                  </a>
                </li>
              </ul>
            </div>

            <div className='min-w-0'>
              <h2
                className='mb-2 text-sm leading-6 font-semibold wrap-anywhere'
                data-fallback-i18n='Integration guides'
              >
                {t('Integration guides')}
              </h2>
              <ul>
                {FEATURED_INTEGRATION_GUIDES.map((guide) => (
                  <li
                    key={guide.id}
                    className='text-muted-foreground text-sm leading-6'
                  >
                    <a
                      href={getIntegrationDocUrl(guide.docPath, language)}
                      data-fallback-doc-path={guide.docPath}
                      target='_blank'
                      rel='noopener noreferrer'
                      className={footerLinkClassName}
                    >
                      <span data-fallback-i18n={guide.labelKey}>
                        {t(guide.labelKey)}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className='min-w-0' data-server-nav='about'>
              <h2
                className='mb-2 text-sm leading-6 font-semibold wrap-anywhere'
                data-fallback-i18n='About'
              >
                {t('About')}
              </h2>
              <ul>
                <li className='text-muted-foreground text-sm leading-6'>
                  <a href='/about' className={footerLinkClassName}>
                    <span data-fallback-i18n='About us'>{t('About us')}</span>
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        </div>
      </div>
    </footer>
  )
}
