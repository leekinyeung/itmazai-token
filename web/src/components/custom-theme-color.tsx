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
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useThemeCustomization } from '@/context/theme-customization-provider'
import { normalizeThemeColor } from '@/lib/theme-customization'

export function CustomThemeColor() {
  const { t } = useTranslation()
  const { customization, setCustomColor } = useThemeCustomization()
  const id = useId()
  const [draft, setDraft] = useState(customization.customColor)
  const [invalid, setInvalid] = useState(false)

  const commitColor = () => {
    const color = normalizeThemeColor(draft)
    setInvalid(!color)
    if (!color) return
    setDraft(color)
    setCustomColor(color)
  }

  return (
    <div className='bg-muted/40 mt-4 space-y-3 rounded-lg border p-3'>
      <Label htmlFor={`${id}-picker`}>{t('Custom theme color')}</Label>
      <div className='flex min-w-0 items-center gap-3'>
        <Input
          id={`${id}-picker`}
          type='color'
          value={customization.customColor}
          aria-label={t('Choose theme color')}
          className='h-10 w-12 shrink-0 cursor-pointer p-1'
          onChange={(event) => {
            const color = event.target.value
            setCustomColor(color)
            setDraft(color)
            setInvalid(false)
          }}
        />
        <div className='min-w-0 flex-1'>
          <Label className='sr-only' htmlFor={`${id}-hex`}>
            {t('Hex color')}
          </Label>
          <Input
            id={`${id}-hex`}
            value={draft}
            placeholder='#2563eb'
            spellCheck={false}
            autoComplete='off'
            className='h-10 font-mono'
            aria-invalid={invalid}
            aria-describedby={`${id}-help`}
            onChange={(event) => {
              setDraft(event.target.value)
              setInvalid(false)
            }}
            onBlur={commitColor}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              commitColor()
            }}
          />
        </div>
      </div>
      <p
        id={`${id}-help`}
        role={invalid ? 'alert' : undefined}
        className={
          invalid ? 'text-destructive text-xs' : 'text-muted-foreground text-xs'
        }
      >
        {invalid
          ? t('Enter a valid hex color, such as #2563eb.')
          : t('Choose a color. Changes are saved automatically.')}
      </p>
    </div>
  )
}
