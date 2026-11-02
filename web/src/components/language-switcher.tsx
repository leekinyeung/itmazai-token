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
import { Check, ChevronDown } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { changeInterfaceLanguage } from '@/i18n/config'
import {
  INTERFACE_LANGUAGE_OPTIONS,
  normalizeInterfaceLanguage,
} from '@/i18n/languages'
import { api } from '@/lib/api'
import { handleServerError } from '@/lib/handle-server-error'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

export function LanguageSwitcher(
  props: {
    showLabel?: boolean
    className?: string
  } = {}
) {
  const { i18n, t } = useTranslation()
  const user = useAuthStore((s) => s.auth.user)
  const currentLanguage = normalizeInterfaceLanguage(i18n.language)
  const currentLanguageOption = INTERFACE_LANGUAGE_OPTIONS.find(
    (lang) => lang.code === currentLanguage
  )
  const [changing, setChanging] = useState(false)
  const handleChangeLanguage = useCallback(
    async (code: string) => {
      setChanging(true)
      try {
        if (!(await changeInterfaceLanguage(code))) return
        if (user) {
          try {
            await api.put('/api/user/self', { language: code })
          } catch {
            // Best-effort persistence; don't block the UI on failure
          }
        }
      } catch (error) {
        handleServerError(error, t('Failed to update settings'))
      } finally {
        setChanging(false)
      }
    },
    [t, user]
  )

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        disabled={changing}
        render={
          <Button
            variant='ghost'
            size={props.showLabel ? 'default' : 'icon'}
            className={cn(
              'h-9',
              props.showLabel ? 'gap-2 px-2' : 'w-9',
              props.className
            )}
          />
        }
      >
        <img
          src={currentLanguageOption?.flag}
          alt=''
          aria-hidden='true'
          width={24}
          height={16}
          className='h-4 w-6 rounded-xs object-cover'
        />
        {props.showLabel && (
          <>
            <span
              aria-hidden='true'
              className='hidden max-w-28 truncate text-sm sm:inline'
            >
              {currentLanguageOption?.label}
            </span>
            <ChevronDown
              aria-hidden='true'
              className='hidden size-3.5 sm:block'
            />
          </>
        )}
        <span className='sr-only'>{t('Change language')}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='min-w-40'>
        {INTERFACE_LANGUAGE_OPTIONS.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            disabled={changing}
            onClick={() => handleChangeLanguage(lang.code)}
          >
            <img
              src={lang.flag}
              alt=''
              aria-hidden='true'
              width={24}
              height={16}
              className='h-4 w-6 shrink-0 rounded-xs object-cover'
            />
            {lang.label}
            <Check
              size={14}
              className={cn(
                'ms-auto',
                currentLanguage !== lang.code && 'hidden'
              )}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
