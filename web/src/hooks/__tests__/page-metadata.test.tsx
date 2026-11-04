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
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { act, cleanup, renderHook } from '@testing-library/react'
import { createInstance, type i18n } from 'i18next'
import { StrictMode, type ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { usePageMetadata } from '@/hooks/use-page-metadata'

const webRoot = resolve(import.meta.dirname, '../../..')
const html = readFileSync(resolve(webRoot, 'index.html'), 'utf8')
const locales = [
  ['en', 'en', 'en', 'TaoDock'],
  ['zhCN', 'zh', 'zh-CN', '众妙之门'],
  ['zhTW', 'zh-TW', 'zh-TW', '眾妙之門'],
  ['fr', 'fr', 'fr', 'TaoDock'],
  ['ja', 'ja', 'ja', 'TaoDock'],
  ['ru', 'ru', 'ru', 'TaoDock'],
  ['vi', 'vi', 'vi', 'TaoDock'],
] as const
const resources: Record<string, { translation: Record<string, string> }> =
  Object.fromEntries(
    locales.map(([language, file]) => [
      language,
      JSON.parse(
        readFileSync(resolve(webRoot, `src/i18n/locales/${file}.json`), 'utf8')
      ),
    ])
  )
const homepageTitle = 'Unified AI API Gateway | TaoDock'
const descriptionKey =
  'Connect leading AI models through one familiar API, from your first prototype to your next production release.'
let instance: i18n
let originalHead: string
let originalLanguage: string

function MetadataProvider(props: { children: ReactNode }) {
  return (
    <StrictMode>
      <I18nextProvider i18n={instance}>{props.children}</I18nextProvider>
    </StrictMode>
  )
}

beforeEach(async () => {
  originalHead = document.head.innerHTML
  originalLanguage = document.documentElement.lang
  document.head.innerHTML = new DOMParser().parseFromString(
    html,
    'text/html'
  ).head.innerHTML
  instance = createInstance()
  await instance.init({
    lng: 'en',
    fallbackLng: 'en',
    resources,
    nsSeparator: false,
    interpolation: { escapeValue: false },
  })
})

afterEach(() => {
  cleanup()
  document.head.innerHTML = originalHead
  document.documentElement.lang = originalLanguage
})

describe('page metadata', () => {
  it('keeps the homepage description and SEO title when system branding refreshes', () => {
    const { rerender } = renderHook(
      (props) => usePageMetadata(props.systemName, '/'),
      { initialProps: { systemName: 'TaoDock' }, wrapper: MetadataProvider }
    )

    expect(document.title).toBe(homepageTitle)
    rerender({ systemName: 'Custom AI' })

    expect(document.title).toBe(homepageTitle)
    for (const selector of [
      'meta[name="title"]',
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
    ]) {
      expect(document.querySelector(selector)).toHaveAttribute(
        'content',
        document.title
      )
    }
    expect(
      document.querySelector('meta[property="og:site_name"]')
    ).toHaveAttribute('content', 'Custom AI')
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      descriptionKey
    )
  })

  it.each(locales)(
    'updates homepage metadata when the language changes to %s',
    async (language, file, htmlLanguage, brandName) => {
      renderHook(() => usePageMetadata('TaoDock', '/'), {
        wrapper: MetadataProvider,
      })
      await act(async () => {
        await instance.changeLanguage(language)
      })

      const translation = resources[language].translation
      expect(translation[descriptionKey]).toBeTruthy()
      if (file !== 'en') {
        expect(translation[descriptionKey]).not.toBe(descriptionKey)
      }
      expect(document.title).toBe(homepageTitle)
      for (const selector of [
        'meta[name="title"]',
        'meta[property="og:title"]',
        'meta[name="twitter:title"]',
      ]) {
        expect(document.querySelector(selector)).toHaveAttribute(
          'content',
          homepageTitle
        )
      }
      expect(
        document.querySelector('meta[property="og:site_name"]')
      ).toHaveAttribute('content', brandName)
      expect(document.documentElement.lang).toBe(htmlLanguage)
      for (const selector of [
        'meta[name="description"]',
        'meta[property="og:description"]',
        'meta[name="twitter:description"]',
      ]) {
        expect(document.querySelector(selector)).toHaveAttribute(
          'content',
          translation[descriptionKey]
        )
      }
    }
  )

  it('localizes the default Chinese brand while retaining a custom system name', async () => {
    await instance.changeLanguage('zhCN')
    const { rerender } = renderHook(
      (props) => usePageMetadata(props.systemName, '/'),
      { initialProps: { systemName: 'Taodock' }, wrapper: MetadataProvider }
    )

    expect(document.title).toBe(homepageTitle)
    rerender({ systemName: 'Custom AI' })
    expect(document.title).toBe(homepageTitle)
  })

  it('keeps an administrator-defined brand in public page metadata', () => {
    renderHook(() => usePageMetadata('Custom AI', '/models'), {
      wrapper: MetadataProvider,
    })

    expect(document.title).toBe('AI Models & API Pricing | Custom AI')
    expect(
      document.querySelector('meta[property="og:site_name"]')
    ).toHaveAttribute('content', 'Custom AI')
  })

  it('updates public page metadata on navigation and removes canonical links on private pages', () => {
    const { rerender, unmount } = renderHook(
      (props) => usePageMetadata('TaoDock', props.pathname),
      { initialProps: { pathname: '/' }, wrapper: MetadataProvider }
    )

    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1)
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://taodock.com/'
    )
    expect(document.querySelector('meta[property="og:url"]')).toHaveAttribute(
      'content',
      'https://taodock.com/'
    )
    rerender({ pathname: '/models' })
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://taodock.com/models'
    )
    expect(document.title).toBe('AI Models & API Pricing | TaoDock')
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'Explore available AI models, supported API endpoints and current pricing on TaoDock.'
    )
    rerender({ pathname: '/integrations' })
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://taodock.com/integrations'
    )
    expect(document.title).toBe('AI Client and SDK Integrations | TaoDock')
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'Connect Cherry Studio, WorkBuddy, Open WebUI, AionUI, DeepChat and OpenAI SDK applications to TaoDock through one OpenAI-compatible API.'
    )
    rerender({ pathname: '/model-evaluation' })
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://taodock.com/model-evaluation'
    )
    expect(document.title).toBe('OpenAI-Compatible Model Evaluation | TaoDock')
    rerender({ pathname: '/keys' })
    expect(document.querySelector('link[rel="canonical"]')).toBeNull()
    expect(document.querySelector('meta[property="og:url"]')).toBeNull()
    expect(document.title).toBe('TaoDock')
    rerender({ pathname: '/' })
    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1)
    expect(document.title).toBe(homepageTitle)
    unmount()
    expect(document.querySelector('link[rel="canonical"]')).toBeNull()
  })

  it('reuses the server canonical and removes query filters from the public URL', () => {
    const canonical = document.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]'
    )
    expect(canonical).not.toBeNull()
    if (!canonical) return
    canonical.href = 'https://taodock.com/models'
    renderHook(() => usePageMetadata('TaoDock', '/models/'), {
      wrapper: MetadataProvider,
    })

    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1)
    expect(document.querySelector('meta[property="og:url"]')).toHaveAttribute(
      'content',
      'https://taodock.com/models'
    )
  })

  it('gives a model detail page its own title, description and canonical URL', () => {
    renderHook(() => usePageMetadata('TaoDock', '/models/gpt-6.1-sol/'), {
      wrapper: MetadataProvider,
    })

    expect(document.title).toBe(
      'gpt-6.1-sol API Pricing and Capabilities | TaoDock'
    )
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'View API capabilities, supported endpoints and current pricing for gpt-6.1-sol on TaoDock.'
    )
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://taodock.com/models/gpt-6.1-sol'
    )
  })

  it('keeps English content metadata fixed while the interface uses another language', async () => {
    await instance.changeLanguage('zhCN')
    renderHook(
      () =>
        usePageMetadata('TaoDock', '/compare/taodock-vs-openrouter/?ref=test'),
      { wrapper: MetadataProvider }
    )

    expect(document.documentElement.lang).toBe('en')
    expect(document.title).toBe(
      'TaoDock vs OpenRouter: Choosing a Unified AI API Gateway | 众妙之门'
    )
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://taodock.com/compare/taodock-vs-openrouter'
    )
    expect(document.querySelector('meta[property="og:type"]')).toHaveAttribute(
      'content',
      'article'
    )
    expect(
      document.querySelector('meta[property="article:published_time"]')
    ).toHaveAttribute('content', '2026-11-04')
    expect(
      document.querySelector('meta[property="article:modified_time"]')
    ).toHaveAttribute('content', '2026-11-04')
  })

  it('canonicalizes model IDs with the shared single-segment encoding', () => {
    renderHook(
      () =>
        usePageMetadata('TaoDock', '/models/vendor%2fmodel%20%21%27%28%29%2a'),
      { wrapper: MetadataProvider }
    )

    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://taodock.com/models/vendor%2Fmodel%20%21%27%28%29%2A'
    )
  })

  it('localizes the pricing page title and description after switching to Chinese', async () => {
    renderHook(() => usePageMetadata('TaoDock', '/models'), {
      wrapper: MetadataProvider,
    })
    await act(async () => {
      await instance.changeLanguage('zhCN')
    })

    expect(document.title).toBe('AI 模型与 API 价格 | 众妙之门')
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      '查看 众妙之门 的可用 AI 模型、支持的 API 接口和当前价格。'
    )
  })

  it.each(['/models/%ZZ', '/models/a/b', `/models/${'a'.repeat(201)}`])(
    'keeps invalid model URL %s out of canonical metadata',
    (pathname) => {
      renderHook(() => usePageMetadata('TaoDock', pathname), {
        wrapper: MetadataProvider,
      })
      expect(document.title).toBe('TaoDock')
      expect(document.querySelector('link[rel="canonical"]')).toBeNull()
    }
  )
})
