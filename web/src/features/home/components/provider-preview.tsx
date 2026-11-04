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
import { ArrowUpRight01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { cn } from '@/lib/utils'

import type { HOME_PROVIDERS } from '../model-providers'

export function ProviderPreview(props: {
  provider: (typeof HOME_PROVIDERS)[number]
}) {
  const { t } = useTranslation()
  const Icon = props.provider.icon

  return (
    <Card className='home-provider-card group h-full gap-0 overflow-hidden py-0 transition-[box-shadow,translate] duration-200 hover:-translate-y-1 hover:shadow-md motion-reduce:transition-none'>
      <img
        src='/images/home/provider-ribbon.png'
        width={660}
        height={540}
        alt=''
        aria-hidden='true'
        loading='lazy'
        decoding='async'
        className={cn(
          'pointer-events-none absolute -top-4 -right-5 h-[85%] w-[110%] object-contain object-right-top opacity-65 dark:opacity-15',
          props.provider.ribbonClass
        )}
      />
      <CardContent className='home-provider-content relative flex min-w-0 flex-1 flex-col items-start px-6 pt-6'>
        <span aria-hidden='true' className={props.provider.color}>
          <Icon size={60} className='home-provider-icon' />
        </span>
        <h3 className='home-provider-name mt-5 text-2xl font-semibold tracking-tight'>
          {props.provider.name}
        </h3>
        <p className='home-provider-description text-muted-foreground mt-2 text-[15px] leading-relaxed'>
          {t(props.provider.description)}
        </p>
      </CardContent>
      <CardFooter className='home-provider-footer relative border-0 bg-transparent px-6 pt-4 pb-5'>
        <Button
          variant='link'
          className='home-link h-auto gap-1.5 p-0 text-[15px] font-medium'
          render={
            <Link
              to='/models'
              search={{ search: props.provider.search }}
              aria-label={t('Explore {{provider}} models', {
                provider: props.provider.name,
              })}
            />
          }
        >
          {t('View models')}
          <HugeiconsIcon
            icon={ArrowUpRight01Icon}
            size={16}
            aria-hidden='true'
          />
        </Button>
      </CardFooter>
    </Card>
  )
}
