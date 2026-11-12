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
import { Link } from '@tanstack/react-router'
import { ArrowRight, ExternalLink } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { PublicLayout } from '@/components/layout'
import { RichContent } from '@/components/rich-content'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/stores/auth-store'

import { trackPublicContentEvent } from './analytics'
import {
  getPublicContentPage,
  getPublicContentPages,
  PUBLIC_CONTENT,
} from './content-registry'
import type {
  GeneratedPublicContentPage,
  PublicContentKind,
} from './content-schema'

export function ContentStructuredData(props: { values: string[] }) {
  useEffect(() => {
    document
      .querySelectorAll('script[data-public-content-jsonld]')
      .forEach((script) => script.remove())
    const scripts = props.values.map((value) => {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.dataset.publicContentJsonld = 'true'
      script.textContent = value
      document.head.appendChild(script)
      return script
    })
    return () => scripts.forEach((script) => script.remove())
  }, [props.values])
  return null
}

function useContentView(page: GeneratedPublicContentPage): void {
  const trackedPath = useRef('')
  useEffect(() => {
    if (trackedPath.current === page.path) return
    trackedPath.current = page.path
    trackPublicContentEvent('public_content_view', {
      kind: page.kind,
      slug: page.slug,
      placement: 'page',
      target: page.path,
    })
  }, [page])
}

function relatedLabel(path: string): string {
  const page = getPublicContentPage(path)
  if (page) return page.subject || page.title
  const labels: Record<string, string> = {
    '/blog': 'Blog',
    '/compare': 'AI gateway comparisons',
    '/integrations': 'Integrations',
    '/keys': 'API keys',
    '/models': 'Models and pricing',
  }
  return labels[path] || path
}

function ContentBreadcrumb(props: { page: GeneratedPublicContentPage }) {
  const { page } = props
  let parent: { path: string; label: string } | null = null
  if (page.kind === 'comparison') {
    parent = { path: '/compare', label: 'AI gateway comparisons' }
  } else if (page.kind === 'integration') {
    parent = { path: '/integrations', label: 'Integrations' }
  } else if (page.kind === 'blog') {
    parent = { path: '/blog', label: 'Blog' }
  }
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link to='/' />}>Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        {parent && (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link to={parent.path} />}>
                {parent.label}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </>
        )}
        <BreadcrumbItem>
          <BreadcrumbPage>{page.subject || page.title}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}

export function PublicContentCta(props: {
  kind: PublicContentKind | 'comparison-hub' | 'blog-hub'
  slug: string
}) {
  const { t } = useTranslation()
  const signedIn = useAuthStore((state) => Boolean(state.auth.user))
  const primaryTarget = signedIn ? '/keys' : '/sign-up'
  const primaryLabel = signedIn ? t('Manage API keys') : t('Create an account')
  const track = (placement: string, target: string) =>
    trackPublicContentEvent('public_content_cta_click', {
      kind: props.kind,
      slug: props.slug,
      placement,
      target,
    })
  return (
    <Card className='border-primary/20 bg-primary/[0.035]'>
      <CardHeader>
        <CardTitle>
          <h2>{t('Start building with Taodock')}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-5'>
        <p className='text-muted-foreground max-w-2xl leading-7'>
          {t(
            'Create a dedicated API key, verify its available models, and test a representative request before sending production traffic.'
          )}
        </p>
        <div className='flex flex-wrap gap-3'>
          <Button
            size='lg'
            render={<Link to={primaryTarget} />}
            onClick={() => track('primary', primaryTarget)}
          >
            {primaryLabel}
            <ArrowRight aria-hidden='true' />
          </Button>
          <Button
            size='lg'
            variant='outline'
            render={<Link to='/models' />}
            onClick={() => track('secondary', '/models')}
          >
            {t('Browse all models and pricing')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function PublicContentPage(props: { page: GeneratedPublicContentPage }) {
  const { page } = props
  const { t } = useTranslation()
  useContentView(page)
  const reviewed = page.reviewedAt || page.updatedAt

  return (
    <PublicLayout>
      <ContentStructuredData values={page.structuredData} />
      <article
        lang='en'
        className='mx-auto w-full max-w-4xl space-y-12 py-8 md:py-14'
      >
        <ContentBreadcrumb page={page} />
        <header className='space-y-5'>
          <p className='text-primary text-sm font-semibold tracking-[0.14em] uppercase'>
            {page.cluster}
          </p>
          <h1 className='text-4xl font-semibold tracking-tight text-balance sm:text-5xl'>
            {page.title}
          </h1>
          <p className='text-muted-foreground max-w-3xl text-lg leading-8'>
            {page.description}
          </p>
          <p className='text-muted-foreground text-sm'>
            {t('Reviewed {{reviewed}} · Updated {{updated}}', {
              reviewed,
              updated: page.updatedAt,
            })}
          </p>
        </header>

        {page.steps.length > 0 && (
          <section aria-labelledby='public-content-steps' className='space-y-5'>
            <h2 id='public-content-steps' className='text-2xl font-semibold'>
              {t('Setup steps')}
            </h2>
            <ol className='grid gap-4 md:grid-cols-2'>
              {page.steps.map((step, index) => (
                <li key={step.title}>
                  <Card className='h-full'>
                    <CardHeader>
                      <p className='text-primary text-sm font-semibold'>
                        {String(index + 1).padStart(2, '0')}
                      </p>
                      <CardTitle>
                        <h3>{step.title}</h3>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className='text-muted-foreground leading-7'>
                      {step.description}
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ol>
          </section>
        )}

        <RichContent content={page.body} className='prose-base' />

        {page.faqItems.length > 0 && (
          <section aria-labelledby='public-content-faq' className='space-y-4'>
            <h2 id='public-content-faq' className='text-2xl font-semibold'>
              {t('Frequently asked questions')}
            </h2>
            <Accordion className='rounded-xl border px-4'>
              {page.faqItems.map((item, index) => (
                <AccordionItem key={item.question} value={String(index)}>
                  <AccordionTrigger className='py-4 text-base'>
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className='text-muted-foreground pb-4 text-base leading-7'>
                    <p>{item.answer}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        )}

        {page.sources.length > 0 && (
          <section
            aria-labelledby='public-content-sources'
            className='space-y-4'
          >
            <h2 id='public-content-sources' className='text-2xl font-semibold'>
              {t('Sources and review notes')}
            </h2>
            <ul className='space-y-2'>
              {page.sources.map((source) => (
                <li key={source.url}>
                  <a
                    href={source.url}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-primary inline-flex items-center gap-2 underline-offset-4 hover:underline'
                  >
                    {source.label}
                    <ExternalLink aria-hidden='true' className='size-4' />
                  </a>
                </li>
              ))}
            </ul>
            {page.docsUrl && (
              <Button
                variant='outline'
                render={
                  <a
                    href={page.docsUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                  />
                }
              >
                {t('Read the full documentation')}
                <ExternalLink aria-hidden='true' />
              </Button>
            )}
          </section>
        )}

        <nav aria-labelledby='public-content-related' className='space-y-4'>
          <h2 id='public-content-related' className='text-2xl font-semibold'>
            {t('Related resources')}
          </h2>
          <div className='flex flex-wrap gap-3'>
            {page.related.map((path) => (
              <Button key={path} variant='outline' render={<Link to={path} />}>
                {relatedLabel(path)}
              </Button>
            ))}
          </div>
        </nav>

        <PublicContentCta kind={page.kind} slug={page.slug} />
      </article>
    </PublicLayout>
  )
}

export function CompareHub() {
  const { t } = useTranslation()
  const pages = getPublicContentPages('comparison')
  const hub = PUBLIC_CONTENT.compareHub
  const tracked = useRef(false)
  useEffect(() => {
    if (tracked.current) return
    tracked.current = true
    trackPublicContentEvent('public_content_view', {
      kind: 'comparison-hub',
      slug: 'compare',
      placement: 'page',
      target: hub.path,
    })
  }, [hub.path])

  return (
    <PublicLayout>
      <ContentStructuredData values={hub.structuredData} />
      <div
        lang='en'
        className='mx-auto w-full max-w-6xl space-y-12 py-8 md:py-14'
      >
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link to='/' />}>Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>AI gateway comparisons</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <header className='max-w-4xl space-y-5'>
          <p className='text-primary text-sm font-semibold tracking-[0.14em] uppercase'>
            AI gateway comparisons
          </p>
          <h1 className='text-4xl font-semibold tracking-tight text-balance sm:text-5xl'>
            Compare Taodock with other AI API gateways
          </h1>
          <p className='text-muted-foreground max-w-3xl text-lg leading-8'>
            Use sourced, review-dated guides to compare deployment models,
            provider access, routing, key controls, usage records and
            operational trade-offs.
          </p>
        </header>
        <section aria-labelledby='comparison-guides' className='space-y-5'>
          <h2 id='comparison-guides' className='text-2xl font-semibold'>
            {t('Comparison guides')}
          </h2>
          <div className='grid gap-4 md:grid-cols-2'>
            {pages.map((page) => (
              <Card key={page.path} className='h-full'>
                <CardHeader>
                  <CardTitle>
                    <h3>{page.subject || page.title}</h3>
                  </CardTitle>
                </CardHeader>
                <CardContent className='flex flex-1 flex-col gap-5'>
                  <p className='text-muted-foreground leading-7'>
                    {page.description}
                  </p>
                  <p className='text-muted-foreground mt-auto text-sm'>
                    {t('Reviewed {{date}}', {
                      date: page.reviewedAt || page.updatedAt,
                    })}
                  </p>
                  <Button
                    variant='outline'
                    render={<Link to={page.path} />}
                    onClick={() =>
                      trackPublicContentEvent('public_content_cta_click', {
                        kind: 'comparison-hub',
                        slug: 'compare',
                        placement: 'comparison-card',
                        target: page.path,
                      })
                    }
                  >
                    {t('Read comparison')}
                    <ArrowRight aria-hidden='true' />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
        <PublicContentCta kind='comparison-hub' slug='compare' />
      </div>
    </PublicLayout>
  )
}
