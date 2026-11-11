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
import {
  Cancel01Icon,
  LinkSquare01Icon,
  PlayIcon,
  RefreshIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import type { UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { PasswordInput } from '@/components/password-input'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

import type { ModelEvaluationFormValues, ModelOption } from '../types'
import { EvaluationPanel } from './evaluation-panel'

type ConnectionPanelProps = {
  form: UseFormReturn<ModelEvaluationFormValues>
  modelOptions: ModelOption[]
  loadingModels: boolean
  disabled: boolean
  running: boolean
  workerEnabled: boolean
  onLoadModels: () => void
  onCancel: () => void
}

export function ConnectionPanel(props: ConnectionPanelProps) {
  const { t } = useTranslation()

  return (
    <EvaluationPanel title={t('Connection settings')} icon={LinkSquare01Icon}>
      <div className='flex flex-1 flex-col gap-5'>
        <FormField
          control={props.form.control}
          name='baseUrl'
          render={({ field }) => (
            <FormItem>
              <FormLabel required>{t('Base URL')}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type='url'
                  autoCapitalize='none'
                  autoComplete='off'
                  spellCheck={false}
                  disabled={props.disabled}
                  placeholder='https://api.openai.com/v1'
                  className='h-11'
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={props.form.control}
          name='apiKey'
          render={({ field }) => (
            <FormItem>
              <FormLabel required>{t('API Key')}</FormLabel>
              <FormControl>
                <PasswordInput
                  {...field}
                  autoComplete='off'
                  disabled={props.disabled}
                  placeholder='sk-...'
                  className='[&_input]:h-11'
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type='button'
          variant='outline'
          size='lg'
          className='h-11 w-full'
          disabled={props.disabled || props.loadingModels}
          onClick={props.onLoadModels}
        >
          {props.loadingModels ? (
            <Spinner aria-label={t('Loading models')} />
          ) : (
            <HugeiconsIcon icon={RefreshIcon} aria-hidden='true' />
          )}
          {t('Load models')}
        </Button>

        <FormField
          control={props.form.control}
          name='targetModel'
          render={({ field }) => (
            <FormItem>
              <FormLabel required>{t('Target model')}</FormLabel>
              <FormControl>
                <Combobox
                  options={props.modelOptions}
                  value={field.value}
                  onValueChange={(value) => field.onChange(value || '')}
                  allowCustomValue
                  openOnFocus
                  aria-label={t('Target model')}
                  aria-invalid={Boolean(
                    props.form.formState.errors.targetModel
                  )}
                  placeholder={t('Select or enter a model')}
                  emptyText={t('Enter a model name to use it directly')}
                  className={cn(
                    'h-11',
                    props.disabled && 'pointer-events-none opacity-50'
                  )}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={props.form.control}
          name='judgeModel'
          render={({ field }) => (
            <FormItem>
              <FormLabel required>{t('Judge model')}</FormLabel>
              <FormControl>
                <Combobox
                  options={props.modelOptions}
                  value={field.value}
                  onValueChange={(value) => field.onChange(value || '')}
                  allowCustomValue
                  openOnFocus
                  aria-label={t('Judge model')}
                  aria-invalid={Boolean(props.form.formState.errors.judgeModel)}
                  placeholder={t('Select or enter a model')}
                  emptyText={t('Enter a model name to use it directly')}
                  className={cn(
                    'h-11',
                    props.disabled && 'pointer-events-none opacity-50'
                  )}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className='mt-auto pt-2'>
          {props.running ? (
            <Button
              type='button'
              variant='destructive'
              size='lg'
              className='h-12 w-full text-base'
              onClick={props.onCancel}
            >
              <HugeiconsIcon icon={Cancel01Icon} aria-hidden='true' />
              {t('Cancel evaluation')}
            </Button>
          ) : (
            <Button
              type='submit'
              size='lg'
              className='h-12 w-full text-base shadow-[0_12px_30px_-16px_var(--primary)]'
              disabled={!props.workerEnabled}
            >
              <HugeiconsIcon icon={PlayIcon} aria-hidden='true' />
              {t('Start evaluation')}
            </Button>
          )}
        </div>
      </div>
    </EvaluationPanel>
  )
}
