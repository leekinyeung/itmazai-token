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
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react'
import { createElement, type ComponentProps } from 'react'
import { useForm } from 'react-hook-form'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Form } from '@/components/ui/form'

import * as modelEvaluationApi from '../api'
import {
  assertBrowserCompatibleUrl,
  generateOpenAICompletion,
  loadOpenAIModels,
  ModelEndpointError,
} from '../api'
import { ConnectionPanel } from '../components/connection-panel'
import { ResultsPanel } from '../components/results-panel'
import {
  createEvaluationStartMessage,
  createMetricStates,
  useModelEvaluation,
} from '../hooks/use-model-evaluation'
import { BUILT_IN_EVALUATION_CASE } from '../lib/built-in-evaluation-case'
import {
  modelEvaluationDefaultValues,
  modelEvaluationFormSchema,
} from '../lib/form-schema'
import type { ModelEvaluationFormValues } from '../types'

const values: ModelEvaluationFormValues = {
  ...modelEvaluationDefaultValues,
  baseUrl: 'https://models.example/v1',
  apiKey: 'sk-browser-only',
  targetModel: 'target-model',
  judgeModel: 'judge-model',
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe('model evaluation inputs', () => {
  it('runs all metrics for the fixed built-in benchmark', () => {
    expect(createMetricStates()).toEqual([
      { name: 'answer_relevancy', status: 'pending' },
      { name: 'correctness', status: 'pending' },
      { name: 'faithfulness', status: 'pending' },
    ])
  })

  it('builds a worker message without endpoint credentials', () => {
    const message = createEvaluationStartMessage(values, 'Target output')

    expect(message).toEqual({
      type: 'start',
      input: BUILT_IN_EVALUATION_CASE.input,
      actualOutput: 'Target output',
      expectedOutput: BUILT_IN_EVALUATION_CASE.expectedOutput,
      retrievalContext: BUILT_IN_EVALUATION_CASE.retrievalContext,
      judgeModel: 'judge-model',
    })
    expect(message).not.toHaveProperty('apiKey')
    expect(message).not.toHaveProperty('baseUrl')
  })

  it.each([
    'https://models.example',
    'https://models.example///',
    'https://models.example/v1///',
    'https://models.example/proxy/v1',
    'https://models.example/api/v4',
    'https://models.example/v1beta/openai',
  ])('accepts a Base URL without requiring a v1 suffix: %s', (baseUrl) => {
    expect(
      modelEvaluationFormSchema.safeParse({ ...values, baseUrl }).success
    ).toBe(true)
  })

  it.each(['', 'not a URL', '/v1', 'ftp://models.example/v1'])(
    'rejects an invalid Base URL without throwing: %s',
    (baseUrl) => {
      expect(
        modelEvaluationFormSchema.safeParse({ ...values, baseUrl }).success
      ).toBe(false)
    }
  )
})

describe('built-in benchmark panel', () => {
  function ConnectionPanelHarness() {
    const form = useForm<ModelEvaluationFormValues>({
      defaultValues: modelEvaluationDefaultValues,
    })
    const formProps = form as ComponentProps<
      typeof Form<ModelEvaluationFormValues>
    >

    return createElement(
      Form<ModelEvaluationFormValues>,
      formProps,
      createElement(
        'form',
        null,
        createElement(ConnectionPanel, {
          form,
          modelOptions: [],
          loadingModels: false,
          disabled: false,
          running: false,
          workerEnabled: true,
          onLoadModels: vi.fn(),
          onCancel: vi.fn(),
        })
      )
    )
  }

  it('starts with an empty Base URL and disables autocomplete like the API key', () => {
    render(createElement(ConnectionPanelHarness))

    const baseUrl = screen.getByRole('textbox', { name: /^Base URL/ })
    expect(baseUrl).toHaveValue('')
    expect(baseUrl).toHaveAttribute('autocomplete', 'off')
    expect(baseUrl).toHaveAttribute('placeholder', 'https://api.openai.com')
    expect(baseUrl).toHaveAccessibleDescription(
      'URLs without a path use /v1 automatically. Custom API paths are preserved.'
    )
    expect(screen.getByLabelText(/^API Key/)).toHaveValue('')
  })

  it('keeps the built-in case hidden and exposes the run action with connection settings', () => {
    render(createElement(ConnectionPanelHarness))

    expect(
      screen.queryByText(BUILT_IN_EVALUATION_CASE.input)
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Built-in benchmark')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Start evaluation' })
    ).toBeVisible()
  })
})

describe('OpenAI-compatible browser requests', () => {
  it.each([
    {
      baseUrl: 'https://models.example',
      modelsUrl: 'https://models.example/v1/models',
      completionUrl: 'https://models.example/v1/chat/completions',
    },
    {
      baseUrl: '  https://models.example///  ',
      modelsUrl: 'https://models.example/v1/models',
      completionUrl: 'https://models.example/v1/chat/completions',
    },
    {
      baseUrl: 'https://models.example/v1///',
      modelsUrl: 'https://models.example/v1/models',
      completionUrl: 'https://models.example/v1/chat/completions',
    },
    {
      baseUrl: 'https://models.example/proxy/v1/',
      modelsUrl: 'https://models.example/proxy/v1/models',
      completionUrl: 'https://models.example/proxy/v1/chat/completions',
    },
    {
      baseUrl: 'https://models.example/api/v4/',
      modelsUrl: 'https://models.example/api/v4/models',
      completionUrl: 'https://models.example/api/v4/chat/completions',
    },
    {
      baseUrl: 'https://models.example/v1beta/openai/',
      modelsUrl: 'https://models.example/v1beta/openai/models',
      completionUrl: 'https://models.example/v1beta/openai/chat/completions',
    },
    {
      baseUrl: 'https://models.example/?tenant=demo#settings',
      modelsUrl: 'https://models.example/v1/models?tenant=demo',
      completionUrl: 'https://models.example/v1/chat/completions?tenant=demo',
    },
  ])(
    'uses the same API prefix for model loading and completion: $baseUrl',
    async (testCase) => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ data: [{ id: 'target-model' }] }), {
            status: 200,
          })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              choices: [{ message: { content: 'Target output' } }],
            }),
            { status: 200 }
          )
        )
      vi.stubGlobal('fetch', fetchMock)

      await expect(
        loadOpenAIModels(testCase.baseUrl, 'sk-browser-only')
      ).resolves.toEqual([{ label: 'target-model', value: 'target-model' }])
      await expect(
        generateOpenAICompletion({
          baseUrl: testCase.baseUrl,
          apiKey: 'sk-browser-only',
          model: 'target-model',
          prompt: 'Question',
          signal: new AbortController().signal,
        })
      ).resolves.toBe('Target output')

      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        testCase.modelsUrl,
        expect.objectContaining({ method: 'GET' })
      )
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        testCase.completionUrl,
        expect.objectContaining({ method: 'POST' })
      )
    }
  )

  it('loads and sorts models without persisting the API key', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ data: [{ id: 'model-z' }, { id: 'model-a' }] }),
          { status: 200 }
        )
      )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      loadOpenAIModels('https://models.example/v1/', 'sk-browser-only')
    ).resolves.toEqual([
      { label: 'model-a', value: 'model-a' },
      { label: 'model-z', value: 'model-z' },
    ])
    expect(fetchMock).toHaveBeenCalledWith(
      'https://models.example/v1/models',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-browser-only',
        }),
      })
    )
    expect(window.localStorage.length).toBe(0)
    expect(window.sessionStorage.length).toBe(0)
  })

  it('maps endpoint authentication and malformed completion errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response(null, { status: 401 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ choices: [] }), { status: 200 })
        )
    )

    await expect(
      loadOpenAIModels('https://models.example/v1', 'bad-key')
    ).rejects.toMatchObject({
      translationKey: 'The model endpoint rejected the API key',
    })
    await expect(
      generateOpenAICompletion({
        baseUrl: 'https://models.example/v1',
        apiKey: 'sk-browser-only',
        model: 'target-model',
        prompt: 'Hello',
        signal: new AbortController().signal,
      })
    ).rejects.toMatchObject({
      translationKey: 'The model endpoint returned an invalid chat completion',
    })
  })

  it.each([
    {
      payload: {
        error: {
          message:
            "The 'gpt-5.2' model is not supported. (request id: req_123)",
        },
      },
      detail: "The 'gpt-5.2' model is not supported. (request id: req_123)",
    },
    {
      payload: { message: 'No available channels for this model' },
      detail: 'No available channels for this model',
    },
  ])(
    'preserves a safe upstream error detail from $payload',
    async (testCase) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify(testCase.payload), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      )

      await expect(
        generateOpenAICompletion({
          baseUrl: 'https://models.example/v1',
          apiKey: 'sk-browser-only',
          model: 'target-model',
          prompt: 'Hello',
          signal: new AbortController().signal,
        })
      ).rejects.toMatchObject({
        translationKey: 'The model endpoint request failed',
        detail: testCase.detail,
      })
    }
  )

  it.each([
    {
      status: 429,
      body: JSON.stringify({ error: { message: 'provider detail' } }),
      translationKey: 'The model endpoint rate limit was reached',
    },
    {
      status: 502,
      body: '<html><body>proxy failure</body></html>',
      translationKey: 'The model endpoint request failed',
    },
    {
      status: 502,
      body: '{invalid json',
      translationKey: 'The model endpoint request failed',
    },
    {
      status: 502,
      body: JSON.stringify({ error: { message: '<html>failure</html>' } }),
      translationKey: 'The model endpoint request failed',
    },
  ])(
    'keeps status $status failures generic when details are unsafe or reserved',
    async (testCase) => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValue(
            new Response(testCase.body, { status: testCase.status })
          )
      )

      await expect(
        loadOpenAIModels('https://models.example/v1', 'sk-browser-only')
      ).rejects.toMatchObject({
        translationKey: testCase.translationKey,
        detail: undefined,
      })
    }
  )

  it('caps upstream error details before presenting them', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ error: { message: 'x'.repeat(1200) } }),
            { status: 500 }
          )
        )
    )

    const error = await generateOpenAICompletion({
      baseUrl: 'https://models.example/v1',
      apiKey: 'sk-browser-only',
      model: 'target-model',
      prompt: 'Hello',
      signal: new AbortController().signal,
    }).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ModelEndpointError)
    expect((error as ModelEndpointError).detail).toHaveLength(1000)
  })

  it('blocks mixed-content model endpoints', () => {
    expect(() =>
      assertBrowserCompatibleUrl('http://models.example/v1', 'https:')
    ).toThrowError(
      expect.objectContaining({
        translationKey: 'HTTPS pages cannot connect to an HTTP model endpoint',
      })
    )
  })
})

describe('evaluation lifecycle', () => {
  class MockWebSocket extends EventTarget {
    static readonly OPEN = 1
    readonly sent: string[] = []
    readyState = MockWebSocket.OPEN

    send(data: string) {
      this.sent.push(data)
    }

    close() {
      this.readyState = 3
    }

    receive(message: object) {
      this.dispatchEvent(
        new MessageEvent('message', { data: JSON.stringify(message) })
      )
    }
  }

  it('keeps each worker score, threshold, and reason when evaluation completes', async () => {
    const sockets: MockWebSocket[] = []
    const WebSocketFactory = vi.fn(function () {
      const socket = new MockWebSocket()
      sockets.push(socket)
      return socket
    })
    Object.assign(WebSocketFactory, { OPEN: MockWebSocket.OPEN })
    vi.stubGlobal('WebSocket', WebSocketFactory)
    vi.spyOn(modelEvaluationApi, 'generateOpenAICompletion').mockResolvedValue(
      'Target output'
    )
    const hook = renderHook(useModelEvaluation)
    let runPromise: Promise<void> | undefined

    act(() => {
      runPromise = hook.result.current.run(values)
    })
    await waitFor(() => expect(sockets).toHaveLength(1))
    const metrics = [
      {
        metric: 'answer_relevancy',
        score: 0.9,
        threshold: 0.5,
        passed: true,
        reason: 'Relevant',
      },
      {
        metric: 'correctness',
        score: 0.4,
        threshold: 0.6,
        passed: false,
        reason: 'Missing detail',
      },
      {
        metric: 'faithfulness',
        score: 1,
        threshold: 0.5,
        passed: true,
        reason: 'Grounded',
      },
    ]
    await act(async () => {
      for (const metric of metrics) {
        sockets[0].receive({ type: 'metric_completed', ...metric })
      }
      sockets[0].receive({ type: 'completed', passed: false, metrics })
      await runPromise
    })

    expect(hook.result.current.state).toMatchObject({
      status: 'completed',
      overallPassed: false,
    })
    expect(hook.result.current.state.metrics).toEqual([
      {
        name: 'answer_relevancy',
        status: 'passed',
        score: 0.9,
        threshold: 0.5,
        reason: 'Relevant',
      },
      {
        name: 'correctness',
        status: 'failed',
        score: 0.4,
        threshold: 0.6,
        reason: 'Missing detail',
      },
      {
        name: 'faithfulness',
        status: 'passed',
        score: 1,
        threshold: 0.5,
        reason: 'Grounded',
      },
    ])
  })

  it('preserves a judge endpoint detail after the worker reports failure', async () => {
    const sockets: MockWebSocket[] = []
    const WebSocketFactory = vi.fn(function () {
      const socket = new MockWebSocket()
      sockets.push(socket)
      return socket
    })
    Object.assign(WebSocketFactory, { OPEN: MockWebSocket.OPEN })
    vi.stubGlobal('WebSocket', WebSocketFactory)
    vi.spyOn(modelEvaluationApi, 'generateOpenAICompletion')
      .mockResolvedValueOnce('Target output')
      .mockRejectedValueOnce(
        new ModelEndpointError(
          'The model endpoint request failed',
          'Judge provider rejected this model (request id: req_judge)'
        )
      )
    const hook = renderHook(useModelEvaluation)
    let runPromise: Promise<void> | undefined

    act(() => {
      runPromise = hook.result.current.run(values)
    })
    await waitFor(() => expect(sockets).toHaveLength(1))
    sockets[0].receive({ type: 'ready' })
    sockets[0].receive({
      type: 'judge_request',
      requestId: 'judge-1',
      prompt: 'Judge this output',
    })
    await waitFor(() =>
      expect(
        sockets[0].sent.some((data) => data.includes('judge_response'))
      ).toBe(true)
    )
    sockets[0].receive({ type: 'error', code: 'JUDGE_REQUEST_FAILED' })
    await act(async () => {
      await runPromise
    })

    expect(hook.result.current.state).toMatchObject({
      status: 'error',
      errorKey: 'The model endpoint request failed',
      errorDetail: 'Judge provider rejected this model (request id: req_judge)',
    })
  })

  it('aborts target generation and reports cancellation', async () => {
    let requestSignal: AbortSignal | undefined
    vi.spyOn(modelEvaluationApi, 'generateOpenAICompletion').mockImplementation(
      ({ signal }) => {
        requestSignal = signal
        return new Promise((_resolve, reject) => {
          signal.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true }
          )
        })
      }
    )
    const hook = renderHook(useModelEvaluation)
    let runPromise: Promise<void> | undefined

    act(() => {
      runPromise = hook.result.current.run(values)
    })
    await waitFor(() => {
      expect(hook.result.current.state.status).toBe('generating')
    })
    act(() => hook.result.current.cancel())
    await act(async () => {
      await runPromise
    })

    expect(requestSignal?.aborted).toBe(true)
    expect(hook.result.current.state.status).toBe('cancelled')
  })

  it('aborts target generation when the page unmounts', async () => {
    let requestSignal: AbortSignal | undefined
    vi.spyOn(modelEvaluationApi, 'generateOpenAICompletion').mockImplementation(
      ({ signal }) => {
        requestSignal = signal
        return new Promise((_resolve, reject) => {
          signal.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true }
          )
        })
      }
    )
    const hook = renderHook(useModelEvaluation)

    act(() => {
      void hook.result.current.run(values)
    })
    await waitFor(() => {
      expect(hook.result.current.state.status).toBe('generating')
    })
    hook.unmount()

    expect(requestSignal?.aborted).toBe(true)
  })
})

describe('evaluation errors', () => {
  it('renders upstream error markup as text', () => {
    render(
      createElement(ResultsPanel, {
        state: {
          status: 'error',
          actualOutput: '',
          metrics: [],
          errorKey: 'The model endpoint request failed',
          errorDetail: '<img src=x onerror=alert(1)>',
        },
      })
    )

    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeVisible()
    expect(document.querySelector('img')).not.toBeInTheDocument()
  })
})
