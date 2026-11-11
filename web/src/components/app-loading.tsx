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
import { useRouterState } from '@tanstack/react-router'
import { Suspense, use, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { ThemeCustomizationProvider } from '@/context/theme-customization-provider'
import { HomeLoadingSkeleton } from '@/features/home/components/home-loading-skeleton'
import { LoadingSkeleton } from '@/features/pricing/components/loading-skeleton'
import { PricingPageFrame } from '@/features/pricing/components/pricing-page-frame'

import { PublicLayoutFrame } from './layout/components/public-layout-frame'
import { Skeleton } from './ui/skeleton'

interface LoadingLocation {
  pathname: string
  search: string
}

function PublicHeaderSkeleton() {
  return (
    <header aria-hidden='true' className='fixed inset-x-0 top-0 z-50'>
      <div className='mx-auto max-w-7xl px-4 md:px-6'>
        <div className='flex h-16 items-center justify-between gap-2 px-2'>
          <div className='flex min-w-0 flex-1 items-center gap-2.5 lg:min-w-36'>
            <Skeleton className='size-7 shrink-0 rounded-lg' />
            <Skeleton className='h-4 w-16' />
          </div>
          <div className='hidden items-center gap-3 lg:flex'>
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className='h-8 w-16' />
            ))}
            <Skeleton className='h-8 w-20 rounded-lg' />
          </div>
          <div className='flex items-center gap-2 lg:hidden'>
            <Skeleton className='size-8 rounded-full' />
            <Skeleton className='size-11 rounded-lg' />
          </div>
        </div>
      </div>
    </header>
  )
}

export function AppLoading(props: { location: LoadingLocation }) {
  const { t } = useTranslation(undefined, { useSuspense: false })
  const pathname = props.location.pathname.replace(/\/+$/, '') || '/'

  if (pathname === '/' || pathname === '/models' || pathname === '/pricing') {
    return (
      <PublicLayoutFrame
        header={<PublicHeaderSkeleton />}
        showMainContainer={false}
      >
        {pathname === '/' ? (
          <div className='home-page'>
            <HomeLoadingSkeleton />
          </div>
        ) : (
          <PricingPageFrame>
            <LoadingSkeleton
              viewMode={
                new URLSearchParams(props.location.search).get('view') ===
                'table'
                  ? 'table'
                  : 'card'
              }
            />
          </PricingPageFrame>
        )}
      </PublicLayoutFrame>
    )
  }

  return (
    <main
      role='status'
      aria-busy='true'
      aria-label={t('Loading...')}
      className='mx-auto flex min-h-svh max-w-6xl flex-col gap-8 px-6 py-24'
    >
      <Skeleton className='h-10 w-40' />
      <Skeleton className='h-40 w-full max-w-xl' />
      <Skeleton className='h-12 w-64' />
    </main>
  )
}

export function RouteLoading() {
  const location = useRouterState({
    select: (state) => ({
      pathname: state.location.pathname,
      search: state.location.searchStr,
    }),
  })
  return <AppLoading location={location} />
}

function ReadyContent(props: { ready: Promise<unknown>; children: ReactNode }) {
  use(props.ready)
  return props.children
}

export function AppLoadingBoundary(props: {
  ready: Promise<unknown>
  location: LoadingLocation
  children: ReactNode
}) {
  return (
    <ThemeCustomizationProvider>
      <Suspense fallback={<AppLoading location={props.location} />}>
        <ReadyContent ready={props.ready}>{props.children}</ReadyContent>
      </Suspense>
    </ThemeCustomizationProvider>
  )
}
