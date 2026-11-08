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
import { ArrowRight } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { PublicLayout } from '@/components/layout'
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

import { trackPublicContentEvent } from './analytics'
import { getPublicContentPages, PUBLIC_CONTENT } from './content-registry'
import {
  ContentStructuredData,
  PublicContentCta,
} from './public-content-page'

export function BlogHub() {
  const { t } = useTranslation()
  const pages = [...getPublicContentPages('blog')].sort((left, right) =>
    right.publishedAt.localeCompare(left.publishedAt)
  )
  const hub = PUBLIC_CONTENT.blogHub
  const tracked = useRef(false)
  useEffect(() => {
    if (tracked.current) return
    tracked.current = true
    trackPublicContentEvent('public_content_view', {
      kind: 'blog-hub',
      slug: 'blog',
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
              <BreadcrumbPage>Blog</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <header className='max-w-4xl space-y-5'>
          <p className='text-primary text-sm font-semibold tracking-[0.14em] uppercase'>
            Blog
          </p>
          <h1 className='text-4xl font-semibold tracking-tight text-balance sm:text-5xl'>
            {hub.title}
          </h1>
          <p className='text-muted-foreground max-w-3xl text-lg leading-8'>
            {hub.description}
          </p>
        </header>
        <section aria-labelledby='blog-articles' className='space-y-5'>
          <h2 id='blog-articles' className='text-2xl font-semibold'>
            {t('Latest articles')}
          </h2>
          {pages.length === 0 ? (
            <Card>
              <CardContent className='text-muted-foreground py-10 text-center leading-7'>
                {t('New articles are on the way. Check back soon.')}
              </CardContent>
            </Card>
          ) : (
            <div className='grid gap-4 md:grid-cols-2'>
              {pages.map((page) => (
                <Card key={page.path} className='h-full'>
                  <CardHeader>
                    <p className='text-primary text-sm font-semibold tracking-[0.14em] uppercase'>
                      {page.cluster}
                    </p>
                    <CardTitle>
                      <h3>{page.title}</h3>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='flex flex-1 flex-col gap-5'>
                    <p className='text-muted-foreground leading-7'>
                      {page.description}
                    </p>
                    <p className='text-muted-foreground mt-auto text-sm'>
                      {t('Published {{date}}', { date: page.publishedAt })}
                    </p>
                    <Button
                      variant='outline'
                      render={<Link to={page.path} />}
                      onClick={() =>
                        trackPublicContentEvent('public_content_cta_click', {
                          kind: 'blog-hub',
                          slug: 'blog',
                          placement: 'blog-card',
                          target: page.path,
                        })
                      }
                    >
                      {t('Read article')}
                      <ArrowRight aria-hidden='true' />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
        <PublicContentCta kind='blog-hub' slug='blog' />
      </div>
    </PublicLayout>
  )
}
