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
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PublicLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import {
  getIntegrationDocUrl,
  INTEGRATION_CATALOG,
  INTEGRATION_COPY,
} from './catalog'
import { IntegrationMark } from './integration-mark'

export function Integrations() {
  const { i18n, t } = useTranslation()
  const guideUrl = getIntegrationDocUrl(
    '/guide/clients.html',
    i18n.resolvedLanguage || i18n.language
  )

  return (
    <PublicLayout>
      <div className='mx-auto flex w-full max-w-6xl flex-col gap-16 py-10 md:py-16'>
        <header className='max-w-3xl space-y-6'>
          <p className='text-primary text-sm font-semibold tracking-[0.14em] uppercase'>
            {t(INTEGRATION_COPY.eyebrow)}
          </p>
          <div className='space-y-4'>
            <h1 className='text-4xl font-semibold tracking-tight text-balance sm:text-5xl'>
              {t(INTEGRATION_COPY.title)}
            </h1>
            <p className='text-muted-foreground max-w-2xl text-lg leading-8'>
              {t(INTEGRATION_COPY.description)}
            </p>
          </div>
          <div className='flex flex-wrap gap-3'>
            <Button size='lg' render={<Link to='/pricing' />}>
              {t(INTEGRATION_COPY.pricingLink)}
              <ArrowRight aria-hidden='true' />
            </Button>
            <Button
              variant='outline'
              size='lg'
              render={
                <a href={guideUrl} target='_blank' rel='noopener noreferrer' />
              }
            >
              {t(INTEGRATION_COPY.docsLink)}
            </Button>
          </div>
        </header>

        <section aria-labelledby='integration-clients-title'>
          <h2 id='integration-clients-title' className='sr-only'>
            {t(INTEGRATION_COPY.eyebrow)}
          </h2>
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {INTEGRATION_CATALOG.map((integration) => {
              const docUrl = getIntegrationDocUrl(
                integration.docPath,
                i18n.resolvedLanguage || i18n.language
              )
              return (
                <Card key={integration.id} className='h-full'>
                  <CardHeader className='grid-cols-[auto_1fr] items-center gap-3'>
                    <div className='text-primary bg-primary/10 flex size-10 items-center justify-center rounded-lg'>
                      <IntegrationMark icon={integration.icon} />
                    </div>
                    <CardTitle>
                      <h3>{integration.name}</h3>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='text-muted-foreground flex-1 leading-6'>
                    {t(INTEGRATION_COPY.clients[integration.id])}
                  </CardContent>
                  <CardFooter>
                    <Button
                      variant='link'
                      className='h-auto px-0'
                      render={
                        <a
                          href={docUrl}
                          target='_blank'
                          rel='noopener noreferrer'
                          aria-label={`${t(INTEGRATION_COPY.docsLink)}: ${integration.name}`}
                        />
                      }
                    >
                      {t(INTEGRATION_COPY.docsLink)}
                      <ArrowRight aria-hidden='true' />
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        </section>

        <section
          aria-labelledby='integration-steps-title'
          className='space-y-6'
        >
          <h2
            id='integration-steps-title'
            className='text-2xl font-semibold tracking-tight sm:text-3xl'
          >
            {t(INTEGRATION_COPY.stepsTitle)}
          </h2>
          <ol className='grid gap-4 md:grid-cols-3'>
            {INTEGRATION_COPY.steps.map((step, index) => (
              <li key={step.title}>
                <Card className='h-full'>
                  <CardHeader>
                    <p className='text-primary text-sm font-semibold'>
                      {String(index + 1).padStart(2, '0')}
                    </p>
                    <CardTitle>
                      <h3>{t(step.title)}</h3>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='text-muted-foreground leading-6'>
                    {t(step.description)}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </PublicLayout>
  )
}
