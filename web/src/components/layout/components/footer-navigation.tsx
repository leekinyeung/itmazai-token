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

import { getIntegrationDocUrl } from '@/features/integrations/catalog'
import { FEATURED_INTEGRATION_GUIDES } from '@/features/integrations/featured-guides'
import { useStatus } from '@/hooks/use-status'
import { normalizeInterfaceLanguage } from '@/i18n/languages'
import { parseHeaderNavModulesFromStatus } from '@/lib/nav-modules'
import { cn } from '@/lib/utils'

export interface FooterColumn {
  title: string
  links: { text: string; href: string }[]
}

export const footerLinkClassName =
  'inline-flex min-h-11 max-w-full items-center rounded-sm py-2 text-start wrap-anywhere transition-colors duration-200 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'

export function FooterNavigation(props: { columns?: FooterColumn[] }) {
  const { t, i18n } = useTranslation()
  const { status } = useStatus()
  const modules = parseHeaderNavModulesFromStatus(status)
  const language = normalizeInterfaceLanguage(
    i18n.resolvedLanguage || i18n.language
  )
  const chinese = language === 'zhCN' || language === 'zhTW'
  const docsBase = `https://docs.taodock.com/${chinese ? '' : 'en/'}`
  const configuredDocs =
    typeof status?.docs_link === 'string' ? status.docs_link.trim() : ''
  let customDocs = ''

  if (configuredDocs.startsWith('/') && !configuredDocs.startsWith('//')) {
    customDocs = configuredDocs
  } else if (configuredDocs) {
    try {
      const url = new URL(configuredDocs)
      const defaultHandbook =
        url.origin === 'https://docs.taodock.com' &&
        ['/', '/en/', '/en', '/index.html', '/en/index.html'].includes(
          url.pathname
        ) &&
        !url.search &&
        !url.hash
      if (['https:', 'http:'].includes(url.protocol) && !defaultHandbook) {
        customDocs = configuredDocs
      }
    } catch {
      // Invalid configured links fall back to the existing handbook.
    }
  }

  const products: FooterColumn['links'] = []
  if (modules.pricing.enabled) {
    products.push({ text: 'Model Square', href: '/models' })
  }
  if (modules.rankings.enabled) {
    products.push({ text: 'Rankings', href: '/rankings' })
  }
  if (modules.console) products.push({ text: 'Console', href: '/dashboard' })

  const about: FooterColumn['links'] = []
  if (modules.about) about.push({ text: 'About us', href: '/about' })

  const documentation: FooterColumn['links'] = [
    { text: 'AI gateway comparisons', href: '/compare' },
    { text: 'Frequently asked questions', href: '/faq' },
  ]
  if (modules.blog !== false) {
    documentation.unshift({ text: 'Blog', href: '/blog' })
  }
  if (modules.docs) {
    if (customDocs) {
      documentation.push({ text: 'Developer documentation', href: customDocs })
    } else {
      documentation.push(
        { text: 'Quick start', href: `${docsBase}quick-start.html` },
        { text: 'Integrations', href: '/integrations' },
        { text: 'API documentation', href: `${docsBase}api/overview.html` }
      )
    }
  }

  const integrationGuides: FooterColumn['links'] =
    FEATURED_INTEGRATION_GUIDES.map((guide) => ({
      text: guide.labelKey,
      href: getIntegrationDocUrl(guide.docPath, language),
    }))

  const defaultColumns: FooterColumn[] = [
    { title: 'Products', links: products },
    { title: 'Documentation', links: documentation },
    { title: 'Integration guides', links: integrationGuides },
    { title: 'About', links: about },
  ]
  const columns = (props.columns ?? defaultColumns).filter(
    (column) => column.links.length > 0
  )
  if (columns.length === 0) return null

  return (
    <nav
      aria-label={t('Footer navigation')}
      className={cn(
        'grid min-w-0 grid-cols-2 gap-x-12 gap-y-8 lg:basis-0',
        columns.length === 1 && 'grid-cols-1',
        columns.length === 3 && 'lg:grid-cols-3',
        columns.length >= 4 && 'lg:grid-cols-4'
      )}
      style={{ flexGrow: Math.min(columns.length, 4) }}
    >
      {columns.map((column) => (
        <div key={column.title} className='min-w-0'>
          <h2 className='mb-2 text-sm leading-6 font-semibold wrap-anywhere'>
            {t(column.title)}
          </h2>
          <ul>
            {column.links.map((link) => (
              <li
                key={`${link.href}:${link.text}`}
                className='text-muted-foreground text-sm leading-6'
              >
                {/^https?:\/\//.test(link.href) ? (
                  <a
                    href={link.href}
                    target='_blank'
                    rel='noopener noreferrer'
                    className={footerLinkClassName}
                  >
                    {t(link.text)}
                  </a>
                ) : (
                  <Link to={link.href} className={footerLinkClassName}>
                    {t(link.text)}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}
