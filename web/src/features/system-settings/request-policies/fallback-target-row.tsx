import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useWatch, type UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { MODEL_CAPABILITY_LABELS } from '@/features/models/types'

import { getFallbackChannelModels } from './fallback-api'
import type { FallbackFormInput, FallbackFormValues } from './fallback-form'

type ChannelOption = {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

type FallbackTargetRowProps = {
  form: UseFormReturn<FallbackFormInput, unknown, FallbackFormValues>
  index: number
  count: number
  channelOptions: ChannelOption[]
  readOnly: boolean
  onMove: (from: number, to: number) => void
  onRemove: (index: number) => void
}

const UNAVAILABLE_LABEL_KEYS: Record<string, string> = {
  channel_disabled: 'Channel disabled',
  missing_capability_metadata: 'Capability metadata is missing',
  invalid_capability_metadata: 'Capability metadata is invalid',
  disabled_capability_metadata: 'Capability metadata is disabled',
}

export function FallbackTargetRow(props: FallbackTargetRowProps) {
  const { t } = useTranslation()
  const channelID = useWatch({
    control: props.form.control,
    name: `targets.${props.index}.channel_id`,
  })
  const selectedModelName = useWatch({
    control: props.form.control,
    name: `targets.${props.index}.model`,
  })
  const modelsQuery = useQuery({
    queryKey: ['fallback', 'channel-models', channelID],
    queryFn: () => getFallbackChannelModels(channelID),
    enabled: channelID > 0,
  })
  const modelOptions = useMemo(
    () =>
      (modelsQuery.data ?? []).map((model) => ({
        value: model.model_name,
        label: model.model_name,
        description:
          model.upstream_model !== model.model_name
            ? t('Mapped upstream model: {{model}}', {
                model: model.upstream_model,
              })
            : undefined,
        disabled: !model.eligible,
      })),
    [modelsQuery.data, t]
  )
  const selectedModel = useMemo(
    () =>
      (modelsQuery.data ?? []).find(
        (model) => model.model_name === selectedModelName
      ),
    [modelsQuery.data, selectedModelName]
  )

  return (
    <div className='space-y-4 rounded-lg border p-4'>
      <div className='flex items-center justify-between gap-3'>
        <div className='text-sm font-medium'>
          {t('Fallback target {{number}}', { number: props.index + 1 })}
        </div>
        <div className='flex shrink-0 gap-1'>
          <Button
            type='button'
            variant='ghost'
            size='icon-sm'
            disabled={props.readOnly || props.index === 0}
            aria-label={t('Move fallback target up')}
            onClick={() => props.onMove(props.index, props.index - 1)}
          >
            <HugeiconsIcon icon={ArrowUp01Icon} aria-hidden='true' />
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='icon-sm'
            disabled={props.readOnly || props.index === props.count - 1}
            aria-label={t('Move fallback target down')}
            onClick={() => props.onMove(props.index, props.index + 1)}
          >
            <HugeiconsIcon icon={ArrowDown01Icon} aria-hidden='true' />
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='icon-sm'
            disabled={props.readOnly}
            aria-label={t('Remove fallback target')}
            onClick={() => props.onRemove(props.index)}
          >
            <HugeiconsIcon icon={Cancel01Icon} aria-hidden='true' />
          </Button>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <FormField
          control={props.form.control}
          name={`targets.${props.index}.channel_id`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Exact channel')}</FormLabel>
              <FormControl>
                <Combobox
                  options={props.channelOptions}
                  value={field.value > 0 ? String(field.value) : null}
                  onValueChange={(value) => {
                    field.onChange(Number(value ?? 0))
                    props.form.setValue(`targets.${props.index}.model`, '', {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }}
                  placeholder={t('Select a fallback channel')}
                  disabled={props.readOnly}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={props.form.control}
          name={`targets.${props.index}.model`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Fallback model')}</FormLabel>
              <FormControl>
                <Combobox
                  options={modelOptions}
                  value={field.value || null}
                  onValueChange={(value) => field.onChange(value ?? '')}
                  placeholder={
                    channelID > 0
                      ? t('Select a fallback model')
                      : t('Select a channel first')
                  }
                  disabled={
                    props.readOnly || channelID <= 0 || modelsQuery.isPending
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {selectedModel && (
        <div className='bg-muted/40 grid gap-3 rounded-lg border p-3 text-sm md:grid-cols-3'>
          <div>
            <FormDescription>{t('Final upstream model')}</FormDescription>
            <div className='mt-1 font-medium break-all'>
              {selectedModel.upstream_model}
            </div>
          </div>
          <div>
            <FormDescription>{t('Capabilities')}</FormDescription>
            <div className='mt-1'>
              {selectedModel.capabilities
                .map((capability) => t(MODEL_CAPABILITY_LABELS[capability]))
                .join(', ') || t('Basic requests only')}
            </div>
          </div>
          <div>
            <FormDescription>{t('Availability')}</FormDescription>
            <div className='mt-1'>
              <StatusBadge
                label={
                  selectedModel.eligible
                    ? t('Available')
                    : t(
                        UNAVAILABLE_LABEL_KEYS[
                          selectedModel.unavailable_reason ?? ''
                        ] ?? 'Unavailable'
                      )
                }
                variant={selectedModel.eligible ? 'success' : 'warning'}
                copyable={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
