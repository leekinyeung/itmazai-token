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
import { useTranslation } from 'react-i18next'

import { Skeleton } from '@/components/ui/skeleton'

import '@/styles/home.css'
import '@/styles/home-hero.css'

export function HomeLoadingSkeleton() {
  const { t } = useTranslation(undefined, { useSuspense: false })

  return (
    <main
      className='home-main min-h-[calc(100svh-4rem)]'
      role='status'
      aria-busy='true'
      aria-label={t('Loading...')}
    >
      <div className='home-hero' aria-hidden='true'>
        <div className='home-hero-copy'>
          <Skeleton className='mx-auto h-8 w-52 rounded-full' />
          <div className='mt-6 space-y-3'>
            <Skeleton className='mx-auto h-32 w-full max-w-3xl sm:h-16' />
            <Skeleton className='mx-auto h-10 w-3/4 max-w-xl sm:h-16' />
          </div>
          <div className='home-hero-description space-y-2'>
            <Skeleton className='mx-auto h-5 w-full' />
            <Skeleton className='mx-auto h-5 w-4/5' />
            <Skeleton className='mx-auto h-5 w-3/5 sm:hidden' />
          </div>
          <div className='home-actions'>
            <Skeleton className='h-12 w-full rounded-lg sm:w-40' />
            <Skeleton className='h-12 w-full rounded-lg sm:w-40' />
          </div>
          <Skeleton className='mx-auto mt-5 h-4 w-44' />
        </div>
        <Skeleton className='home-gateway aspect-[360/620] rounded-2xl lg:aspect-[1000/360]' />
      </div>
    </main>
  )
}
