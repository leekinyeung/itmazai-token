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
  Activity01Icon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  Loading03Icon,
  MinusSignCircleIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useTranslation } from 'react-i18next'

import { LoadingState } from '@/components/loading-state'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { toIntlLocale } from '@/i18n/languages'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

import type { EvaluationMetricState, EvaluationRunState } from '../types'
import { EvaluationPanel } from './evaluation-panel'

const metricLabelKeys = {
  answer_relevancy: 'Answer Relevancy',
  correctness: 'Correctness',
  faithfulness: 'Faithfulness',
} as const

function MetricStatusIcon(props: { metric: EvaluationMetricState }) {
  let icon = MinusSignCircleIcon
  let className = 'text-muted-foreground'
  if (props.metric.status === 'running') {
    icon = Loading03Icon
    className = 'text-primary animate-spin'
  } else if (props.metric.status === 'passed') {
    icon = CheckmarkCircle02Icon
    className = 'text-emerald-500'
  } else if (props.metric.status === 'failed') {
    icon = CancelCircleIcon
    className = 'text-destructive'
  }
  return (
    <HugeiconsIcon
      icon={icon}
      aria-hidden='true'
      className={cn('mt-0.5 size-5 shrink-0', className)}
      strokeWidth={2}
    />
  )
}

function MetricRow(props: { metric: EvaluationMetricState; locale?: string }) {
  const { t } = useTranslation()
  const score = props.metric.score
  const hasScore =
    (props.metric.status === 'passed' || props.metric.status === 'failed') &&
    typeof score === 'number' &&
    Number.isFinite(score) &&
    score >= 0 &&
    score <= 1
  const threshold = props.metric.threshold
  let statusLabel = t('Pending')
  let badgeVariant: 'secondary' | 'destructive' | 'default' | 'outline' =
    'outline'
  if (props.metric.status === 'running') statusLabel = t('Evaluating')
  if (props.metric.status === 'passed') {
    statusLabel = t('Passed')
    badgeVariant = 'default'
  }
  if (props.metric.status === 'failed') {
    statusLabel = t('Failed')
    badgeVariant = 'destructive'
  }
  if (props.metric.status === 'skipped') statusLabel = t('Not run')

  let detail = props.metric.reason
  if (props.metric.status === 'skipped') {
    detail =
      props.metric.name === 'correctness'
        ? t('Add expected output to run this metric')
        : t('Add retrieval context to run this metric')
  }

  return (
    <article
      aria-label={t(metricLabelKeys[props.metric.name])}
      className='flex gap-3 py-4'
    >
      <MetricStatusIcon metric={props.metric} />
      <div className='min-w-0 flex-1 space-y-1.5'>
        <div className='flex flex-wrap items-center gap-2'>
          <h3 className='font-semibold'>
            {t(metricLabelKeys[props.metric.name])}
          </h3>
          {hasScore && (
            <span
              className={cn(
                'ms-auto font-semibold tabular-nums',
                props.metric.status === 'passed'
                  ? 'text-emerald-500'
                  : 'text-destructive'
              )}
            >
              {formatNumber(score * 100, props.locale)}%
            </span>
          )}
          <Badge variant={badgeVariant}>{statusLabel}</Badge>
        </div>
        {typeof threshold === 'number' && Number.isFinite(threshold) && (
          <p className='text-muted-foreground text-xs'>
            {t('Passing threshold: {{threshold}}%', {
              threshold: formatNumber(threshold * 100, props.locale),
            })}
          </p>
        )}
        {detail && (
          <p className='text-muted-foreground text-sm leading-6 break-words whitespace-pre-wrap'>
            {detail}
          </p>
        )}
      </div>
    </article>
  )
}

export function ResultsPanel(props: { state: EvaluationRunState }) {
  const { i18n, t } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const generating = props.state.status === 'generating'
  const executedMetrics = props.state.metrics.filter(
    (metric) => metric.status !== 'skipped'
  )
  const completedMetrics = executedMetrics.filter(
    (metric) => metric.status === 'passed' || metric.status === 'failed'
  ).length
  const scoredMetrics = executedMetrics.filter(
    (metric): metric is EvaluationMetricState & { score: number } =>
      (metric.status === 'passed' || metric.status === 'failed') &&
      typeof metric.score === 'number' &&
      Number.isFinite(metric.score) &&
      metric.score >= 0 &&
      metric.score <= 1
  )
  const overallScore =
    executedMetrics.length > 0 &&
    scoredMetrics.length === executedMetrics.length
      ? scoredMetrics.reduce((total, metric) => total + metric.score, 0) /
        scoredMetrics.length
      : undefined
  const hasRunningMetric = executedMetrics.some(
    (metric) => metric.status === 'running'
  )
  const currentMetric = Math.min(
    completedMetrics + (hasRunningMetric ? 1 : 0),
    executedMetrics.length
  )
  const progress =
    executedMetrics.length > 0
      ? (completedMetrics / executedMetrics.length) * 100
      : 0

  let progressLabel = t('Ready to evaluate')
  if (generating) {
    progressLabel = t('Generating target model response')
  } else if (props.state.status === 'evaluating') {
    progressLabel = t('Evaluating {{current}} / {{total}}', {
      current: currentMetric,
      total: executedMetrics.length,
    })
  } else if (props.state.status === 'completed') {
    progressLabel = props.state.overallPassed
      ? t('Evaluation passed')
      : t('Evaluation failed')
  } else if (props.state.status === 'cancelled') {
    progressLabel = t('Evaluation cancelled')
  }

  return (
    <EvaluationPanel
      title={
        props.state.status === 'completed'
          ? t('Evaluation results')
          : t('Evaluation progress')
      }
      icon={Activity01Icon}
    >
      <div className='flex flex-1 flex-col'>
        <div className='space-y-3'>
          <p
            role={generating ? 'status' : undefined}
            aria-label={generating ? progressLabel : undefined}
            className='flex items-center gap-2 text-base font-semibold'
          >
            {generating && (
              <LoadingState inline size='sm' className='text-primary' />
            )}
            {progressLabel}
          </p>
          {props.state.status === 'completed' ? (
            <section
              aria-label={t('Overall score')}
              className='border-border/80 bg-muted/30 space-y-2 rounded-lg border p-4'
            >
              <h3 className='text-muted-foreground text-sm font-medium'>
                {t('Overall score')}
              </h3>
              {overallScore === undefined ? (
                <p className='text-muted-foreground'>
                  {t('Overall score unavailable')}
                </p>
              ) : (
                <p className='text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl'>
                  {formatNumber(overallScore * 100, locale)}%
                </p>
              )}
              <p className='text-muted-foreground text-sm leading-6'>
                {t(
                  'Equal-weight average for this test case; each metric must pass its own threshold'
                )}
              </p>
            </section>
          ) : (
            <Progress value={progress} aria-label={t('Evaluation progress')} />
          )}
        </div>

        {props.state.errorKey && (
          <Alert variant='destructive' className='mt-5'>
            <AlertTitle>{t('Evaluation failed')}</AlertTitle>
            <AlertDescription>
              <p>{t(props.state.errorKey)}</p>
              {props.state.errorDetail && (
                <p className='break-words whitespace-pre-wrap'>
                  {props.state.errorDetail}
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {props.state.metrics.length > 0 && (
          <section className='mt-4' aria-label={t('Metric results')}>
            {props.state.metrics.map((metric, index) => (
              <div key={metric.name}>
                {index > 0 && <Separator />}
                <MetricRow metric={metric} locale={locale} />
              </div>
            ))}
          </section>
        )}

        <p className='text-muted-foreground mt-auto pt-6 text-right text-xs'>
          {t('Powered by DeepEval')}
        </p>
      </div>
    </EvaluationPanel>
  )
}
