import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: 'TaoDock 使用手册',
  description: 'TaoDock 专属使用指南：账号与密钥、模型选择、客户端配置、API 调用、钱包与用量排查。',
  srcExclude: ['README.md'],
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
    },
    en: {
      label: 'English',
      lang: 'en',
      title: 'TaoDock User Guide',
      description: 'Connect to TaoDock: account setup, API keys, models, clients, API requests, wallet, and troubleshooting.',
      themeConfig: {
        nav: [
          { text: 'Quick start', link: '/en/quick-start' },
          { text: 'API integration', link: '/en/api/overview' },
          { text: 'FAQ', link: '/en/faq' },
          { text: 'Open TaoDock', link: 'https://taodock.com' },
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
              { text: 'Connect an AI client', link: '/en/guide/clients' },
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
          message: 'TaoDock · Console and API: taodock.com · Documentation: docs.taodock.com',
        },
      },
    },
  },
  themeConfig: {
    nav: [
      { text: '快速开始', link: '/quick-start' },
      { text: 'API 接入', link: '/api/overview' },
      { text: '常见问题', link: '/faq' },
      { text: '进入 TaoDock', link: 'https://taodock.com' },
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
          { text: '连接 AI 客户端', link: '/guide/clients' },
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
      message: 'TaoDock · 控制台与 API：taodock.com · 使用手册：docs.taodock.com',
    },
  },
})
