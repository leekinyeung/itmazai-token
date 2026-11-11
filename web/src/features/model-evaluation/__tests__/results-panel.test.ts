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
import { act, render, screen, within } from '@testing-library/react'
import { createInstance } from 'i18next'
import { createElement } from 'react'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, it } from 'vitest'

import { ResultsPanel } from '../components/results-panel'
import type { EvaluationRunState } from '../types'

const completedState: EvaluationRunState = {
  status: 'completed',
  actualOutput: 'The lab has 19 sensors.',
  overallPassed: false,
  metrics: [
    {
      name: 'answer_relevancy',
      status: 'passed',
      score: 0.9,
      threshold: 0.5,
      reason: 'The response addresses the question.',
    },
    {
      name: 'correctness',
      status: 'failed',
      score: 0.4,
      threshold: 0.6,
      reason: 'The response omits an expected detail.',
    },
    {
      name: 'faithfulness',
      status: 'passed',
      score: 1,
      threshold: 0.5,
      reason: 'All claims are grounded in the reference.',
    },
  ],
}

describe('evaluation score results', () => {
  it('shows the completed average as a percentage and keeps a failed metric visible', () => {
    render(createElement(ResultsPanel, { state: completedState }))

    expect(
      screen.getByRole('heading', { name: 'Evaluation results' })
    ).toBeVisible()
    const summary = screen.getByRole('region', { name: 'Overall score' })
    expect(within(summary).getByText('76.67%')).toBeVisible()
    expect(screen.getByText('Evaluation failed')).toBeVisible()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()

    for (const detail of [
      {
        name: 'Answer Relevancy',
        score: '90%',
        threshold: '50%',
        status: 'Passed',
        reason: 'The response addresses the question.',
      },
      {
        name: 'Correctness',
        score: '40%',
        threshold: '60%',
        status: 'Failed',
        reason: 'The response omits an expected detail.',
      },
      {
        name: 'Faithfulness',
        score: '100%',
        threshold: '50%',
        status: 'Passed',
        reason: 'All claims are grounded in the reference.',
      },
    ]) {
      const row = within(screen.getByRole('article', { name: detail.name }))
      expect(row.getByText(detail.score)).toBeVisible()
      expect(
        row.getByText(`Passing threshold: ${detail.threshold}`)
      ).toBeVisible()
      expect(row.getByText(detail.status)).toBeVisible()
      expect(row.getByText(detail.reason)).toBeVisible()
    }
    expect(
      screen.queryByRole('heading', { name: 'Model response' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(completedState.actualOutput)
    ).not.toBeInTheDocument()
  })

  it('does not show a model response placeholder before evaluation starts', () => {
    render(
      createElement(ResultsPanel, {
        state: { status: 'idle', actualOutput: '', metrics: [] },
      })
    )

    expect(
      screen.queryByRole('heading', { name: 'Model response' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('The target model response will appear here')
    ).not.toBeInTheDocument()
  })

  it.each(['evaluating', 'completed', 'cancelled', 'error'] as const)(
    'animates while generating and removes the loading indicator when the run becomes %s',
    (status) => {
      const view = render(
        createElement(ResultsPanel, {
          state: {
            status: 'generating',
            actualOutput: '',
            metrics: [
              { name: 'answer_relevancy', status: 'pending' },
              { name: 'correctness', status: 'pending' },
              { name: 'faithfulness', status: 'pending' },
            ],
          },
        })
      )

      const loading = screen.getByRole('status', {
        name: 'Generating target model response',
      })
      expect(loading).toHaveTextContent('Generating target model response')
      expect(loading.querySelector('.animate-spin')).toBeInTheDocument()

      view.rerender(
        createElement(ResultsPanel, {
          state: { ...completedState, status },
        })
      )

      expect(
        screen.queryByRole('status', {
          name: 'Generating target model response',
        })
      ).not.toBeInTheDocument()
    }
  )

  it.each([
    { score: 0, expected: '0%', status: 'failed' as const },
    { score: 1, expected: '100%', status: 'passed' as const },
  ])(
    'keeps a $expected score and excludes skipped metrics from the average',
    (testCase) => {
      render(
        createElement(ResultsPanel, {
          state: {
            ...completedState,
            overallPassed: testCase.status === 'passed',
            metrics: [
              {
                name: 'answer_relevancy',
                status: testCase.status,
                score: testCase.score,
              },
              { name: 'correctness', status: 'skipped' },
            ],
          },
        })
      )

      const summary = screen.getByRole('region', { name: 'Overall score' })
      expect(within(summary).getByText(testCase.expected)).toBeVisible()
      expect(
        within(screen.getByRole('article', { name: 'Correctness' })).getByText(
          'Not run'
        )
      ).toBeVisible()
    }
  )

  it.each(['evaluating', 'cancelled', 'error'] as const)(
    'does not show a final average while the run is %s',
    (status) => {
      render(
        createElement(ResultsPanel, {
          state: { ...completedState, status },
        })
      )

      expect(
        screen.queryByRole('region', { name: 'Overall score' })
      ).not.toBeInTheDocument()
      expect(
        within(
          screen.getByRole('article', { name: 'Answer Relevancy' })
        ).getByText('90%')
      ).toBeVisible()
    }
  )

  it.each([undefined, Number.NaN, 1.1])(
    'does not fabricate an average when a completed score is %s',
    (score) => {
      render(
        createElement(ResultsPanel, {
          state: {
            ...completedState,
            metrics: [{ name: 'answer_relevancy', status: 'passed', score }],
          },
        })
      )

      expect(screen.getByText('Overall score unavailable')).toBeVisible()
    }
  )

  it.each([
    { language: 'en', expected: '12.35%' },
    { language: 'zhCN', expected: '12.35%' },
    { language: 'zhTW', expected: '12.35%' },
    { language: 'fr', expected: '12,35%' },
    { language: 'ja', expected: '12.35%' },
    { language: 'ru', expected: '12,35%' },
    { language: 'vi', expected: '12,35%' },
    { language: 'invalid_locale', expected: '12.35%' },
  ])(
    'updates score formatting when the interface switches to $language',
    async ({ language, expected }) => {
      const i18n = createInstance()
      await i18n.init({
        lng: 'en',
        fallbackLng: 'en',
        resources: {
          en: { translation: { 'Overall score': 'Overall score' } },
          [language]: { translation: { 'Overall score': 'Overall score' } },
        },
      })
      render(
        createElement(
          I18nextProvider,
          { i18n },
          createElement(ResultsPanel, {
            state: {
              ...completedState,
              metrics: [
                { name: 'answer_relevancy', status: 'failed', score: 0.12345 },
              ],
            },
          })
        )
      )

      await act(async () => {
        await i18n.changeLanguage(language)
      })

      const summary = screen.getByRole('region', { name: 'Overall score' })
      expect(within(summary).getByText(expected)).toBeVisible()
      expect(
        within(
          screen.getByRole('article', { name: 'Answer Relevancy' })
        ).getByText(expected)
      ).toBeVisible()
    }
  )
})
