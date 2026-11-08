# Frontmatter 规范（kind: blog）

每篇博客文章的 YAML frontmatter 由 `web/src/features/public-content/content-schema.ts` 中的 zod schema 强制校验，`bun run content:generate` 失败信息会指出具体文件与字段。

## 完整字段模板

```yaml
---
kind: blog                        # 固定值
slug: how-to-choose-ai-gateway    # 必填；^[a-z0-9]+(-[a-z0-9]+)*$；决定 URL /blog/<slug>；全站所有公开内容中唯一
title: 'How to Choose an AI Gateway in 2026: A Practical Checklist'   # 必填；20–90 字符
description: 'A practical checklist for evaluating AI gateways, from model coverage, routing, and fallbacks to cost controls, observability, and migration effort.'  # 必填；80–180 字符
primaryKeyword: how to choose an AI gateway   # 必填；≥3 字符；本文唯一主攻关键词
cluster: Gateway selection        # 必填；≥3 字符；专题分组，展示在 Hub 卡片与页眉 eyebrow
publishedAt: 2026-11-08           # 必填；YYYY-MM-DD 且为真实日期
updatedAt: 2026-11-08             # 必填；不得早于 publishedAt
reviewedAt: 2026-11-08            # blog 必填；不得早于 publishedAt（E-E-A-T 审查日期）
tags: [ai-gateway, model-routing] # 可选；最多 8 个；每个 ^[a-z0-9]+(-[a-z0-9]+)*$
coverImage: /images/blog/choose-gateway.webp  # 可选；必须匹配 ^/images/blog/[a-z0-9][a-z0-9/-]*\.(png|webp|jpe?g)$；构建时检查文件必须真实存在于 web/public/ 下
sources:                          # 可选；E-E-A-T 信号
  - { label: 'OpenAI API reference', url: 'https://platform.openai.com/docs/api-reference' }
related: [/compare/taodock-vs-openrouter, /models, /integrations/openai-sdk]  # 可选；每条必须是已存在的公开路径
faqItems:                         # 可选；命中 Google FAQ 富摘要
  - { question: 'What is an AI gateway?', answer: 'An AI gateway is ...' }
draft: false                      # true = 不进 sitemap/feed/Hub/产物，相当于不存在
---
```

## 关键校验规则（踩过的坑）

1. **冒号必须加引号**：`title`、`question` 等标量值中只要含 `: `，必须用单引号包裹整个值，否则 YAML 解析直接失败（`Nested mappings are not allowed in compact mappings`）。
2. **related 与正文内链必须指向已存在路径**：合法目标 = `allowedExistingPublicPaths`（/、/about、/blog、/dashboard、/keys、/integrations、/model-evaluation、/models、/privacy-policy、/rankings、/sign-in、/sign-up、/user-agreement）∪ /compare ∪ 所有已发布内容路径。引用不存在的页面会让整个构建失败——被引用的文章必须先发布。
3. **正文链接白名单**：只允许 `/` 开头的站内绝对路径、`https://` 外链、`mailto:`、`#` 锚点；http:// 与相对路径会被拒绝。
4. **正文不得出现 H1**（`#` 开头）与裸 HTML（包括注释）；代码块（``` 或 ~~~）内的内容豁免检查。
5. **slug 全局唯一**：跨所有 kind（comparison/integration/blog/use-case/faq）去重。
6. **sources 与 docsUrl 必须是 https:// URL**。
7. **draft: true 的文章完全不进入任何产物**，可安全提交到仓库当草稿。

## 日期策略

- 新文章：三个日期都填实际发布日。
- 更新文章：只改 `updatedAt`（Google 会在富摘要里显示新鲜日期）；内容经重新审查后同步更新 `reviewedAt`。
- 改完日期必须重跑 `bun run content:generate` 让产物生效。
