import { zodResolver } from '@hookform/resolvers/zod'
import { SecurityWarningIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { StatusBadge } from '@/components/status-badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormLabel,
} from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import {
  ADMIN_PERMISSION_ACTIONS,
  ADMIN_PERMISSION_RESOURCES,
  hasPermission,
} from '@/lib/admin-permissions'
import { handleServerError } from '@/lib/handle-server-error'
import { useAuthStore } from '@/stores/auth-store'

import { SettingsCard } from '../components/settings-card'
import { SettingsSwitchItem } from '../components/settings-form-layout'
import {
  SettingsPageFormActions,
  SettingsPageTitleStatusPortal,
} from '../components/settings-page-context'
import { SettingsSection } from '../components/settings-section'
import {
  getFallbackChannels,
  getFallbackConfig,
  saveFallbackConfig,
} from './fallback-api'
import {
  createFallbackFormSchema,
  fallbackDocumentToForm,
  fallbackFormToDocument,
  type FallbackFormInput,
  type FallbackFormValues,
} from './fallback-form'
import { FallbackTargetRow } from './fallback-target-row'

const CONFIG_QUERY_KEY = ['fallback', 'config'] as const

export function FallbackSection() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.auth.user)
  const canRead = hasPermission(
    user,
    ADMIN_PERMISSION_RESOURCES.FALLBACK_POLICY,
    ADMIN_PERMISSION_ACTIONS.READ
  )
  const canWrite = hasPermission(
    user,
    ADMIN_PERMISSION_RESOURCES.FALLBACK_POLICY,
    ADMIN_PERMISSION_ACTIONS.WRITE
  )
  const formSchema = useMemo(() => createFallbackFormSchema(t), [t])
  const form = useForm<FallbackFormInput, unknown, FallbackFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { enabled: false, targets: [] },
  })
  const targets = useFieldArray({ control: form.control, name: 'targets' })

  const configQuery = useQuery({
    queryKey: CONFIG_QUERY_KEY,
    queryFn: getFallbackConfig,
    enabled: canRead,
  })
  const channelsQuery = useQuery({
    queryKey: ['fallback', 'channels'],
    queryFn: getFallbackChannels,
    enabled: canRead,
  })
  const channelOptions = useMemo(
    () =>
      (channelsQuery.data ?? []).map((channel) => ({
        value: String(channel.channel_id),
        label: `${channel.channel_name} (#${channel.channel_id})`,
        description: channel.enabled ? undefined : t('Channel disabled'),
        disabled: !channel.enabled,
      })),
    [channelsQuery.data, t]
  )
  useEffect(() => {
    if (!configQuery.data) return
    form.reset(fallbackDocumentToForm(configQuery.data.document))
  }, [configQuery.data, form])

  const saveMutation = useMutation({
    mutationFn: (values: FallbackFormValues) =>
      saveFallbackConfig(
        configQuery.data?.revision ?? 0,
        fallbackFormToDocument(values)
      ),
    onSuccess: (snapshot) => {
      queryClient.setQueryData(CONFIG_QUERY_KEY, snapshot)
      form.reset(fallbackDocumentToForm(snapshot.document))
      toast.success(t('Fallback configuration saved'))
    },
    onError: (error) => handleServerError(error),
  })

  if (!canRead) {
    return (
      <Alert variant='destructive'>
        <HugeiconsIcon icon={SecurityWarningIcon} aria-hidden='true' />
        <AlertTitle>{t('Permission required')}</AlertTitle>
        <AlertDescription>
          {t('You do not have permission to view fallback settings.')}
        </AlertDescription>
      </Alert>
    )
  }
  if (configQuery.isError) {
    return (
      <Alert variant='destructive'>
        <HugeiconsIcon icon={SecurityWarningIcon} aria-hidden='true' />
        <AlertTitle>{t('Failed to load settings')}</AlertTitle>
        <AlertDescription>{t('An unexpected error occurred')}</AlertDescription>
      </Alert>
    )
  }
  if (configQuery.isPending || !configQuery.data) {
    return <div className='text-muted-foreground py-8'>{t('Loading...')}</div>
  }

  const snapshot = configQuery.data
  const readOnly = !canWrite
  const save = form.handleSubmit((values) => saveMutation.mutate(values))
  const reset = () => form.reset(fallbackDocumentToForm(snapshot.document))

  return (
    <SettingsSection title={t('Failure fallback')}>
      <SettingsPageTitleStatusPortal>
        <StatusBadge
          label={
            snapshot.document.settings.enabled ? t('Enabled') : t('Disabled')
          }
          variant={snapshot.document.settings.enabled ? 'success' : 'neutral'}
          copyable={false}
        />
      </SettingsPageTitleStatusPortal>
      <SettingsPageFormActions
        onSave={save}
        onReset={reset}
        isSaving={saveMutation.isPending}
        isSaveDisabled={!form.formState.isDirty || readOnly}
        isResetDisabled={!form.formState.isDirty}
      />
      <Form {...form}>
        <SettingsCard
          title={t('Conversation fallback retry')}
          description={t(
            'After normal conversation retries are exhausted, targets are checked in order and the first compatible target is called once. If it fails, the request ends immediately.'
          )}
        >
          <div className='space-y-6'>
            <FormField
              control={form.control}
              name='enabled'
              render={({ field }) => (
                <SettingsSwitchItem>
                  <div>
                    <FormLabel>{t('Enable model fallback')}</FormLabel>
                    <FormDescription>
                      {t(
                        'The fallback target is not retried and does not change original request billing.'
                      )}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={readOnly}
                    />
                  </FormControl>
                </SettingsSwitchItem>
              )}
            />

            <div className='space-y-4'>
              <div className='flex items-center justify-between gap-3'>
                <div>
                  <FormLabel>{t('Fallback targets')}</FormLabel>
                  <FormDescription>
                    {t(
                      'Targets are checked from top to bottom. Unavailable or incompatible targets are skipped before the single fallback call.'
                    )}
                  </FormDescription>
                </div>
                <Button
                  type='button'
                  variant='outline'
                  disabled={readOnly || targets.fields.length >= 20}
                  onClick={() =>
                    targets.append(
                      { channel_id: 0, model: '' },
                      {
                        shouldFocus: false,
                      }
                    )
                  }
                >
                  {t('Add fallback target')}
                </Button>
              </div>

              {targets.fields.map((field, index) => (
                <FallbackTargetRow
                  key={field.id}
                  form={form}
                  index={index}
                  count={targets.fields.length}
                  channelOptions={channelOptions}
                  readOnly={readOnly || channelsQuery.isPending}
                  onMove={targets.move}
                  onRemove={targets.remove}
                />
              ))}

              {targets.fields.length === 0 && (
                <div className='text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm'>
                  {t('No fallback targets configured')}
                </div>
              )}
              {typeof form.formState.errors.targets?.message === 'string' && (
                <p className='text-destructive text-sm'>
                  {form.formState.errors.targets.message}
                </p>
              )}
            </div>
          </div>
        </SettingsCard>
      </Form>
    </SettingsSection>
  )
}
