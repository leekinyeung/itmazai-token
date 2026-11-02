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
import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'

import { HtmlContent } from '@/components/html-content'
import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'
import { DEFAULT_SYSTEM_NAME } from '@/lib/constants'
import { cn } from '@/lib/utils'

import {
  FooterNavigation,
  footerLinkClassName,
  type FooterColumn,
} from './footer-navigation'

interface FooterProps {
  variant?: 'default' | 'compact'
  logo?: string
  name?: string
  columns?: FooterColumn[]
  copyright?: string
  className?: string
}

const NEW_API_FOOTER_ATTRIBUTION_KEY = [
  'footer',
  'new' + 'api',
  'projectAttributionSuffix',
].join('.')

const FOOTER_HTML_OPTIONS = { ADD_ATTR: ['target'] }

function LegalLinks() {
  const { t } = useTranslation()
  const { status } = useStatus()
  const items: { label: string; href: string }[] = []
  if (status?.user_agreement_enabled) {
    items.push({ label: 'User Agreement', href: '/user-agreement' })
  }
  if (status?.privacy_policy_enabled) {
    items.push({ label: 'Privacy Policy', href: '/privacy-policy' })
  }
  return items.map((item, index) => (
    <Fragment key={item.href}>
      {index > 0 && <span aria-hidden='true'>·</span>}
      <Link to={item.href} className={footerLinkClassName}>
        {t(item.label)}
      </Link>
    </Fragment>
  ))
}

function ProjectAttribution(props: { currentYear: number }) {
  const { t } = useTranslation()
  return (
    <p className='text-muted-foreground max-w-lg text-xs leading-5 wrap-anywhere'>
      &copy; {props.currentYear}{' '}
      <a
        href='https://github.com/QuantumNous/new-api'
        target='_blank'
        rel='noopener noreferrer'
        className={cn(footerLinkClassName, 'font-medium')}
      >
        {t('New API')}
      </a>
      . {t(NEW_API_FOOTER_ATTRIBUTION_KEY)}
    </p>
  )
}

export function Footer(props: FooterProps) {
  const { t } = useTranslation()
  const { systemName, logo: systemLogo, footerHtml } = useSystemConfig()
  const displayLogo = systemLogo || props.logo || '/logo.png'
  const displayName = systemName || props.name || DEFAULT_SYSTEM_NAME
  const currentYear = new Date().getFullYear()
  const footerClassName = cn(
    'border-border bg-background text-foreground relative shrink-0 border-t',
    props.className
  )

  if (footerHtml) {
    return (
      <footer className={footerClassName}>
        <div className='mx-auto w-full max-w-7xl px-6 py-6 md:px-8'>
          <HtmlContent
            className='custom-footer text-muted-foreground min-w-0 text-sm leading-6 wrap-anywhere'
            content={footerHtml}
            prose={false}
            inlineSanitizeOptions={FOOTER_HTML_OPTIONS}
          />
          <div className='border-border text-muted-foreground mt-6 flex flex-col items-start justify-between gap-x-8 gap-y-2 border-t pt-4 text-xs leading-5 lg:flex-row'>
            <div className='flex flex-wrap items-center gap-x-3'>
              <LegalLinks />
            </div>
            <ProjectAttribution currentYear={currentYear} />
          </div>
        </div>
      </footer>
    )
  }

  if (props.variant === 'compact') {
    return (
      <footer className={footerClassName}>
        <div className='mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-3.5 md:px-8'>
          <Link to='/' className={cn(footerLinkClassName, 'gap-2.5')}>
            <img
              src={displayLogo}
              alt=''
              className='size-6 shrink-0 rounded-md object-contain'
            />
            <span className='text-sm font-semibold wrap-anywhere'>
              {displayName}
            </span>
          </Link>
          <div className='text-muted-foreground flex flex-wrap items-center gap-x-3 text-xs leading-5'>
            <LegalLinks />
            <ProjectAttribution currentYear={currentYear} />
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer className={footerClassName}>
      <div className='mx-auto w-full max-w-7xl px-6 md:px-8'>
        <div className='flex flex-col gap-10 py-12 lg:flex-row lg:gap-12 lg:py-16'>
          <div className='min-w-0 lg:flex-[2]'>
            <Link to='/' className={cn(footerLinkClassName, 'gap-2.5')}>
              <img
                src={displayLogo}
                alt=''
                className='size-7 shrink-0 rounded-lg object-contain'
              />
              <span className='text-base font-semibold tracking-tight wrap-anywhere'>
                {displayName}
              </span>
            </Link>
            <p className='text-muted-foreground mt-3 max-w-sm text-sm leading-6 wrap-anywhere'>
              {t('One API, many AI capabilities.')}
            </p>
            <p className='text-muted-foreground mt-1 max-w-sm text-sm leading-6 wrap-anywhere'>
              {t('For developers and AI users')}
            </p>
          </div>
          <FooterNavigation columns={props.columns} />
        </div>
        <div className='border-border text-muted-foreground flex flex-col items-start justify-between gap-x-8 gap-y-2 border-t py-6 text-xs leading-5 lg:flex-row'>
          <div className='flex min-w-0 flex-col items-start gap-x-4 gap-y-1 sm:flex-row sm:flex-wrap sm:items-center'>
            <p className='py-3 wrap-anywhere'>
              &copy; {currentYear} {displayName}.{' '}
              {props.copyright ?? t('footer.defaultCopyright')}
            </p>
            <div className='flex flex-wrap items-center gap-x-3'>
              <LegalLinks />
            </div>
          </div>
          <ProjectAttribution currentYear={currentYear} />
        </div>
      </div>
    </footer>
  )
}
