import { defineConfig } from 'vitepress'

const docsOrigin = 'https://docs.taodock.com'

export default defineConfig({
  lang: 'zh-CN',
  title: 'Taodock',
  description: 'Taodock 使用手册：AI API 接入、客户端配置、模型选择、密钥管理、钱包与用量排查。',
  srcExclude: ['README.md'],
  sitemap: {
    hostname: docsOrigin,
  },
  transformHead({ pageData }) {
    if (pageData.relativePath === '404.md') return []
    const path = pageData.relativePath
      .replace(/(^|\/)index\.md$/, '$1')
      .replace(/\.md$/, '.html')
    const chinesePath = path.replace(/^en\//, '')
    const canonical = new URL(path, `${docsOrigin}/`).href
    return [
      ['link', { rel: 'canonical', href: canonical }],
      ['meta', { property: 'og:url', content: canonical }],
      ['link', { rel: 'alternate', hreflang: 'zh-CN', href: new URL(chinesePath, `${docsOrigin}/`).href }],
      ['link', { rel: 'alternate', hreflang: 'en', href: new URL(`en/${chinesePath}`, `${docsOrigin}/`).href }],
    ]
  },
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
    },
    en: {
      label: 'English',
      lang: 'en',
      title: 'Taodock',
      description: 'Connect to Taodock: account setup, API keys, models, clients, API requests, wallet, and troubleshooting.',
      themeConfig: {
        nav: [
          { text: 'Quick start', link: '/en/quick-start' },
          { text: 'Clients & Agents', link: '/en/guide/clients' },
          { text: 'API integration', link: '/en/api/overview' },
          { text: 'FAQ', link: '/en/faq' },
        ],
        sidebar: [
          {
            text: 'Getting started',
            items: [
              { text: 'Guide home', link: '/en/' },
              { text: 'Make your first API call', link: '/en/quick-start' },
            ],
          },
          {
            text: 'User guides',
            items: [
              { text: 'Using the console', link: '/en/guide/console' },
              { text: 'Choose a model', link: '/en/guide/models' },
              { text: 'Manage API keys', link: '/en/guide/api-keys' },
              {
                text: 'Clients & Agents',
                link: '/en/guide/clients',
                collapsed: true,
                items: [
                  { text: 'Cherry Studio', link: '/en/guide/cherry-studio' },
                  { text: 'WorkBuddy', link: '/en/guide/workbuddy' },
                  { text: 'AionUI', link: '/en/guide/clients#aionui' },
                  { text: 'DeepChat', link: '/en/guide/clients#deepchat' },
                  { text: 'Open WebUI', link: '/en/guide/open-webui' },
                ],
              },
              { text: 'Wallet and usage', link: '/en/guide/wallet' },
              { text: 'API integration', link: '/en/api/overview' },
              { text: 'FAQ', link: '/en/faq' },
            ],
          },
        ],
        outline: { level: [2, 3], label: 'On this page' },
        docFooter: { prev: 'Previous', next: 'Next' },
        sidebarMenuLabel: 'Menu',
        returnToTopLabel: 'Back to top',
        darkModeSwitchLabel: 'Appearance',
        lightModeSwitchTitle: 'Switch to light theme',
        darkModeSwitchTitle: 'Switch to dark theme',
        skipToContentLabel: 'Skip to content',
        langMenuLabel: 'Change language',
        notFound: {
          title: 'Page not found',
          quote: 'Return to the home page or search for the guide you need.',
          linkLabel: 'Return to the guide home page',
          linkText: 'Go home',
        },
        footer: {
          message: 'Taodock · Console and API: taodock.com · Documentation: docs.taodock.com',
        },
      },
    },
  },
  themeConfig: {
    nav: [
      { text: '快速开始', link: '/quick-start' },
      { text: '客户端与 Agent', link: '/guide/clients' },
      { text: 'API 接入', link: '/api/overview' },
      { text: '常见问题', link: '/faq' },
    ],
    sidebar: [
      {
        text: '开始使用',
        items: [
          { text: '手册首页', link: '/' },
          { text: '完成第一次调用', link: '/quick-start' },
        ],
      },
      {
        text: '使用指南',
        items: [
          { text: '控制台使用', link: '/guide/console' },
          { text: '选择模型和接口', link: '/guide/models' },
          { text: 'API 密钥管理', link: '/guide/api-keys' },
          {
            text: '客户端与 Agent',
            link: '/guide/clients',
            collapsed: true,
            items: [
              { text: 'Cherry Studio', link: '/guide/cherry-studio' },
              { text: 'WorkBuddy', link: '/guide/workbuddy' },
              { text: 'AionUI', link: '/guide/clients#aionui' },
              { text: 'DeepChat', link: '/guide/clients#deepchat' },
              { text: 'Open WebUI', link: '/guide/open-webui' },
            ],
          },
          { text: '钱包与用量', link: '/guide/wallet' },
          { text: 'API 接入说明', link: '/api/overview' },
          { text: '常见问题', link: '/faq' },
        ],
      },
    ],
    search: {
      provider: 'local',
      options: {
        miniSearch: {
          options: {
            tokenize: (text) =>
              Array.from(
                new Intl.Segmenter('zh-CN', { granularity: 'word' }).segment(text),
                (part) => part.segment,
              ).filter((word) => word.trim()),
          },
        },
        locales: {
          root: {
            translations: {
              button: {
                buttonText: '搜索文档',
                buttonAriaLabel: '搜索文档',
              },
              modal: {
                displayDetails: '显示详细列表',
                resetButtonTitle: '清除搜索',
                backButtonTitle: '关闭搜索',
                noResultsText: '没有找到相关内容',
                footer: {
                  selectText: '选择',
                  navigateText: '切换',
                  closeText: '关闭',
                },
              },
            },
          },
        },
      },
    },
    outline: { level: [2, 3], label: '本页目录' },
    docFooter: { prev: '上一篇', next: '下一篇' },
    sidebarMenuLabel: '目录',
    returnToTopLabel: '返回顶部',
    darkModeSwitchLabel: '切换主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',
    skipToContentLabel: '跳转到内容',
    langMenuLabel: '切换语言',
    notFound: {
      title: '页面不存在',
      quote: '请返回首页，或搜索你需要的使用说明。',
      linkLabel: '返回手册首页',
      linkText: '返回首页',
    },
    footer: {
      message: 'Taodock · 控制台与 API：taodock.com · 使用手册：docs.taodock.com',
    },
  },
})
