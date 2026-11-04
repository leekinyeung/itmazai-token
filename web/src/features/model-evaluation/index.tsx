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
import { zodResolver } from '@hookform/resolvers/zod'
import { InformationCircleIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { PublicLayout } from '@/components/layout'
import { PageTransition } from '@/components/page-transition'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Form } from '@/components/ui/form'
import { useStatus } from '@/hooks/use-status'

import { loadOpenAIModels, ModelEndpointError } from './api'
import { ConnectionPanel } from './components/connection-panel'
import { ResultsPanel } from './components/results-panel'
import { useModelEvaluation } from './hooks/use-model-evaluation'
import {
  modelEvaluationDefaultValues,
  modelEvaluationFormSchema,
} from './lib/form-schema'
import type { ModelEvaluationFormValues, ModelOption } from './types'

export function ModelEvaluation() {
  const { t } = useTranslation()
  const { status, loading: statusLoading } = useStatus()
  const form = useForm<ModelEvaluationFormValues>({
    resolver: zodResolver(modelEvaluationFormSchema),
    defaultValues: modelEvaluationDefaultValues,
  })
  const evaluation = useModelEvaluation()
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const workerEnabled = status?.model_evaluation_enabled === true

  const handleLoadModels = useCallback(async () => {
    const valid = await form.trigger(['baseUrl', 'apiKey'])
    if (!valid) return

    setLoadingModels(true)
    try {
      const options = await loadOpenAIModels(
        form.getValues('baseUrl'),
        form.getValues('apiKey')
      )
      setModelOptions(options)
      toast.success(t('Models loaded'))
    } catch (error) {
      const key =
        error instanceof ModelEndpointError
          ? error.translationKey
          : 'Unable to load models'
      const detail =
        error instanceof ModelEndpointError ? error.detail : undefined
      toast.error(t(key), detail ? { description: detail } : undefined)
    } finally {
      setLoadingModels(false)
    }
  }, [form, t])

  const handleSubmit = form.handleSubmit(async (values) => {
    await evaluation.run(values)
  })

  return (
    <PublicLayout showMainContainer={false}>
      <PageTransition className='mx-auto w-full max-w-[1280px] px-4 pt-24 pb-12 sm:px-6 lg:px-8'>
        <header className='mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-center'>
          <div className='space-y-2'>
            <h1 className='text-4xl font-semibold tracking-tight sm:text-5xl'>
              {t('Model Evaluation')}
            </h1>
            <p className='text-muted-foreground max-w-2xl text-base sm:text-lg'>
              {t(
                'Use DeepEval to quickly evaluate response quality from OpenAI-compatible models'
              )}
            </p>
          </div>
          <div className='border-border/80 bg-muted/40 text-muted-foreground flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm'>
            <HugeiconsIcon
              icon={InformationCircleIcon}
              aria-hidden='true'
              className='size-4'
            />
            {t('Independent tool · API keys are never stored')}
          </div>
        </header>

        {!statusLoading && !workerEnabled && (
          <Alert variant='destructive' className='mb-5'>
            <AlertTitle>{t('Model evaluation is unavailable')}</AlertTitle>
            <AlertDescription>
              {t(
                'The DeepEval worker is not configured on this deployment. Other platform features remain available'
              )}
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form
            onSubmit={(event) => void handleSubmit(event)}
            className='grid gap-4 lg:grid-cols-[minmax(20rem,0.8fr)_minmax(32rem,1.2fr)]'
          >
            <ConnectionPanel
              form={form}
              modelOptions={modelOptions}
              loadingModels={loadingModels}
              disabled={evaluation.running}
              running={evaluation.running}
              workerEnabled={workerEnabled}
              onLoadModels={() => void handleLoadModels()}
              onCancel={evaluation.cancel}
            />
            <ResultsPanel state={evaluation.state} />
          </form>
        </Form>
      </PageTransition>
    </PublicLayout>
  )
}
