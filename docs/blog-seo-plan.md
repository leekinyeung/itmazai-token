# 博客功能 SEO 设计方案

> 目标：为站点增加博客功能，承接内容营销，提升 Google 自然搜索流量。
> 结论先行：**不需要从零建设**。现有「公开内容管线」已具备 70% 的基础设施，本方案以最小增量补齐博客能力。

---

## 1. 现状盘点（关键发现）

现有 `web/src/content/` + `web/scripts/generate-public-content.ts` + Go 服务端 meta 注入，已构成一套「构建时静态化 SEO 管线」：

| 能力 | 现状 |
| --- | --- |
| Markdown 内容源（frontmatter + zod 校验） | ✅ 已有（`content-schema.ts`），`kind: 'blog'` 已在枚举中 |
| 博客详情页路由 `/blog/$slug` | ✅ 已有（`routes/blog/$slug.tsx` → `PublicContentPage`） |
| 构建时生成 `public-content.json` / `page-metadata.json` / `sitemap.xml` | ✅ 已有 |
| Go 端 SSR 注入 title / description / canonical / OG / JSON-LD | ✅ 已有（`router/public_page_metadata.go`） |
| robots.txt 放行 `/blog` | ✅ 已有 |
| 结构化数据（Article / Breadcrumb / FAQ） | ✅ 已有（但 blog 的面包屑父级有 bug，见 §4.3） |
| 博客内容目录 `content/blog/` | ❌ 缺失（一篇文章都没有） |
| 博客列表页 `/blog`（Hub） | ❌ 缺失（参照 `/compare` Hub 模式补） |
| RSS/Atom Feed | ❌ 缺失 |
| 标签/分类聚合页 | ❌ 缺失（`cluster` 字段已预留） |
| 每篇文章独立 OG 图 | ❌ 缺失（全站共用 `social-card.png`） |

**架构决策：沿用「构建时静态化」而非「数据库动态博客」。**

理由：

- SEO 友好度最高：构建时产出静态 HTML meta + sitemap，Go 端直接注入，无运行时依赖；
- 与现有 comparisons/integrations/faq 内容同一套校验、同一套管线，维护成本最低；
- 内容经 Git 评审（frontmatter schema 强制标题 20–90 字符、描述 80–180 字符、内链合法性校验），质量可控；
- 动态博客（DB + 后台编辑器）适合「非技术人员高频发文」场景，若未来有此需求再演进（见 §8 演进路径）。

---

## 2. SEO 目标与原则

1. **收录**：所有博客页面可被 Google 抓取、索引（SSR meta + sitemap + robots 放行）。
2. **排名**：围绕 AI 网关/API 中转主题的 keyword cluster 规划内容，每篇文章一个主关键词（frontmatter 已强制 `primaryKeyword`）。
3. **点击率（CTR）**：标题/描述长度受 schema 约束，OG/Twitter Card 完整。
4. **权重流转**：Hub 页聚合权重，文章间内链互导（`related` 字段 + 正文内链构建时校验）。
5. **技术健康**：Core Web Vitals 达标、唯一 canonical、无重复内容。

---

## 3. 总体架构

```
web/src/content/blog/*.md          ← 内容源（Markdown + YAML frontmatter）
        │
        ▼  bun run generate:public-content（构建时）
web/public/public-content.json     ← SPA 渲染数据源（含博客清单）
web/public/page-metadata.json      ← Go SSR meta 注入数据源
web/public/sitemap.xml             ← 主 sitemap（自动含 /blog/*）
web/public/feed.xml                ← 新增：RSS Feed
        │
        ▼  Go embed 进二进制
router/web-router.go               ← NoRoute 命中公开页 → 注入 meta 返回 HTML
router/public_page_metadata.go     ← title/desc/canonical/OG/JSON-LD 注入
```

渲染链路（用户/Googlebot 访问 `/blog/xxx`）：

1. Go `NoRoute` → 命中 `page-metadata.json` 中的公开页 → 返回已注入完整 SEO meta 的 HTML（Googlebot 无需执行 JS 即可读到 title/description/canonical/JSON-LD）；
2. 浏览器端 SPA hydrate 后由 `PublicContentPage` 渲染正文。

---

## 4. 功能设计

### 4.1 内容模型扩展

在现有 frontmatter schema 基础上，为 `kind: 'blog'` 增加/启用以下字段：

```yaml
---
kind: blog
slug: how-to-choose-ai-gateway
title: 20–90 字符的标题（schema 已强制）
description: 80–180 字符（schema 已强制）
primaryKeyword: ai gateway        # 已强制
cluster: gateway-selection        # 已强制，作为「分类/专题」聚合维度
publishedAt: 2026-11-15           # 已强制
updatedAt: 2026-11-15             # 已强制
reviewedAt: 2026-11-15            # 建议对 blog 也强制（E-E-A-T 审查日期）
sources:                          # 引用来源，增强 E-E-A-T
  - { label: "...", url: "https://..." }
related: [/blog/another-post, /compare/taodock-vs-openrouter]
faqItems:                         # 可选，命中 FAQ 富摘要
  - { question: "...", answer: "..." }
tags: [openai, 计费]              # 新增：标签聚合页
coverImage: /images/blog/xxx.webp # 新增：每篇文章独立 OG 图
draft: false
---
正文（禁止 H1、禁止裸 HTML、内链构建时校验 —— 现有规则不变）
```

Schema 改动点（`content-schema.ts`）：

- 新增 `tags: z.array(z.string()).default([])`、`coverImage: httpsUrlSchema.or(站内路径).optional()`；
- `blog` 类型强制 `reviewedAt`（对齐 comparison/integration 的 E-E-A-T 约束）。

### 4.2 路由与页面

| 路由 | 说明 | 状态 |
| --- | --- | --- |
| `/blog` | 博客列表 Hub：按发布时间倒序，展示标题/摘要/日期/分类/标签，支持分页（`?page=n`，每页 10 篇）与按 cluster/tag 过滤 | 新增 |
| `/blog/$slug` | 文章详情页 | 已有，需增强（见 4.4） |
| `/blog/tags/$tag` | 标签聚合页（文章少时可暂缓，>20 篇后启用） | 二期 |

Hub 页实现直接复用 `/compare` Hub 的模式：

- `routes/blog/index.tsx`：从 `public-content.json` 读 `kind === 'blog'` 的页面列表；
- 构建时在 `page-metadata.base.json` 注入 `/blog` 的 title/description + `CollectionPage` 结构化数据（对齐 `compareHub` 做法，在 manifest 中增加 `blogHub` 字段）；
- sitemap 加入 `/blog`（`lastmod` 取最新文章 `updatedAt`）。

### 4.3 结构化数据修复与增强

`generate-public-content.ts` 中 `breadcrumbData()` 当前对非 comparison 类型一律把父级指向 `/integrations`——**这对 blog 是错误面包屑**，必须修复：

```ts
// 现状：const parent = page.kind === 'comparison' ? '/compare' : '/integrations'
// 改为按 kind 映射：
const hubByKind = { comparison: '/compare', integration: '/integrations', blog: '/blog', 'use-case': '/use-cases' }
```

每篇文章的 JSON-LD 输出：

- `Article`（已有）+ `image`（取自 `coverImage`）；
- `BreadcrumbList`：Home → Blog → 文章（修复后）；
- `FAQPage`（当 `faqItems` 非空，已有逻辑）；
- Hub 页：`CollectionPage` + `BreadcrumbList`。

### 4.4 详情页体验增强（`PublicContentPage` 或新增 `BlogArticlePage`）

- **面包屑导航**（与 JSON-LD 一致的可见面包屑）；
- **目录（TOC）**：从正文 H2/H3 自动生成锚点导航；
- **阅读时长**：按字数估算展示；
- **作者/机构署名 + 发布/更新/审查日期**（E-E-A-T 信号，数据已在 frontmatter）；
- **相关文章**（`related` 字段渲染卡片，已有数据）；
- **底部 CTA**：引导至 `/models`、`/compare` 或注册，承接转化；
- **社交分享按钮**（`lib/social-sharing.ts` 已有基础）。

### 4.5 RSS Feed（新增 `/feed.xml`）

构建时生成 RSS 2.0（含 `atom:link` 自引用）：

- 取 `kind === 'blog'` 的已发布文章，按 `publishedAt` 倒序保留最近 20 篇；
- `web/public/feed.xml` 随构建产出，同时在 HTML `<head>` 注入 `<link rel="alternate" type="application/rss+xml" href="/feed.xml">`（在 `page-metadata.json` 的注入逻辑中追加，或写入基础 index.html）；
- `robots.txt` 追加 `Sitemap: https://taodock.com/feed.xml` 不需要（feed 不是 sitemap），但可在 GSC 中提交。

### 4.6 OG 图策略

- 每篇文章可用 `coverImage` 指定独立社交图（1200×630，存放 `web/public/images/blog/`）；
- 未指定时回退全站 `social-card.png`；
- Go 注入逻辑已支持按页注入 OG 字段，仅需在 `metadataFor(page)` 中把 `og:image`/`twitter:card=summary_large_image` 加入 manifest 字段（`publicPageMetadata` struct 增加 `Image` 字段）。

### 4.7 导航与内链

- 顶部导航 / 页脚增加 Blog 入口（注意走 `HeaderNavModuleIsPublic` 同样的公开开关模式，便于私有化部署关闭）；
- 首页、FAQ、对比页中按 `cluster` 交叉推荐相关博客文章；
- 文章正文内链继续使用构建时校验（`validatePublicContentCollection` 已保证不断链）——注意把 `/blog` 加入 `allowedExistingPublicPaths`。

### 4.8 i18n 策略

- 现有公开内容为英文（`inLanguage: 'en'`），**一期保持英文单语**，主攻 Google.com；
- 二期如做中文内容：按 `/zh/blog/...` 路径规划，配套 `hreflang` 互链（Go 注入逻辑需扩展）——不建议一期混入，避免稀释主题相关性。

---

## 5. 后端（Go）改动清单

改动很小，集中在 `router/`：

1. `publicPageMetadata` struct 增加 `Image string` 字段，`renderPageHTMLWithOptions` 注入 `og:image` / `twitter:card`；
2. `isAPIOrAssetPath` 无需改（`/feed.xml` 走静态文件，`.xml` 后缀已被识别为静态资源）；
3. 若要做 `/sitemap-blog.xml` 动态分片：文章 <500 篇不必拆分，直接进主 `sitemap.xml` 即可（构建时已生成）；
4. （可选）`HeaderNavModuleIsPublic("blog")` 开关，私有化部署时可关闭博客模块。

无需新增数据库表、无需新增管理后台 API。

---

## 6. 构建管线改动清单（`web/scripts/generate-public-content.ts`）

1. 修复 `breadcrumbData()` 的 kind→hub 映射（§4.3）；
2. manifest 增加 `blogHub`（title/description/updatedAt/structuredData），写入 `page-metadata.base.json` 的 `/blog` 页；
3. `metadataFor()` 输出 `image` 字段；
4. 新增 `feed.xml` 生成；
5. sitemap 增加 `/blog`（及二期的 `/blog/tags/*`）；
6. `content-schema.ts` 增加 `tags`/`coverImage` 字段 + blog 强制 `reviewedAt`；
7. `allowedExistingPublicPaths` 增加 `/blog`。

构建命令沿用现有流程（`generate-public-content.ts` 已在 build 链路中），无新增依赖。

---

## 7. 内容策略（SEO 成败的核心）

技术只是载体，排名靠内容。建议的冷启动计划：

**Keyword Cluster 规划**（与产品强相关，承接转化）：

| Cluster | 意图 | 示例选题 |
| --- | --- | --- |
| AI 网关选型 | 商业调查 | How to Choose an AI Gateway in 2026 / AI Gateway vs Direct API |
| 成本优化 | 问题解决 | How to Cut OpenAI API Costs by 40% with Smart Routing |
| 接入教程 | 使用指导 | Migrate from OpenAI to an Aggregated API in 10 Minutes |
| 模型动态 | 信息获取 | GPT-x vs Claude-x Pricing & Context Window Compared |
| 故障/稳定性 | 问题解决 | How to Handle OpenAI Rate Limits and Regional Outages |

**发布节奏**：前 4 周每周 2 篇建立内容基座，之后每周 1 篇；每季度复盘更新旧文（`updatedAt` 刷新是排名信号）。

**写作规范**（已被 schema 半强制化）：

- 每篇 ≥1200 词，H2/H3 结构化，首段 100 词内回答核心问题（争 Featured Snippet）；
- `faqItems` 3–5 条（争 People Also Ask 与 FAQ 富摘要）；
- `sources` 引用官方文档（E-E-A-T）；
- 每篇至少 3 条内链（指向 Hub、对比页、其他文章、产品页）。

**监控闭环**：

- Google Search Console：提交 sitemap，监控收录/展示/点击/排名；
- 现有 `features/public-content/analytics.ts` 补充博客阅读事件（滚动深度、CTR 到注册）；
- 每月输出关键词排名报告，迭代选题。

---

## 8. 落地路线图

**Phase 1 — 技术补齐（约 2–3 天开发量）**

1. `content-schema.ts`：`tags`/`coverImage` 字段、blog 强制 `reviewedAt`、`allowedExistingPublicPaths` 加 `/blog`；
2. `generate-public-content.ts`：修面包屑 bug、加 `blogHub`、`feed.xml`、sitemap 更新、OG image；
3. Go：`publicPageMetadata` 加 `Image` 注入；
4. `routes/blog/index.tsx`：Hub 列表页（含分页/cluster 过滤）；
5. 详情页增强：面包屑、TOC、阅读时长、相关文章、CTA；
6. 导航/页脚加 Blog 入口。

**Phase 2 — 内容冷启动（2–4 周）**

7. 产出首批 8 篇英文文章（覆盖 §7 的 5 个 cluster）；
8. GSC 提交 sitemap + feed，验证收录与富摘要（用 Rich Results Test 抽检）；
9. 完善 OG 图模板。

**Phase 3 — 规模化（持续）**

10. 标签聚合页、专题（cluster）落地页；
11. 中文内容 + hreflang（评估投入产出）；
12. 若发文频率 >每周 3 篇且有非技术作者：再评估 DB 化 + 后台编辑器（保留同一套 schema 与 SEO 注入逻辑，仅替换内容源）。

---

## 9. 风险与注意事项

- **面包屑 bug 是现存缺陷**：当前任何 blog 文章的 JSON-LD 面包屑会错误指向 `/integrations`，发文前必须先修；
- **重复内容**：若同一主题中英文并存且无 hreflang，可能被判定重复——一期坚持英文单语；
- **薄内容风险**：cluster 内文章过少（<3 篇）时聚合页价值低，先把单 cluster 做厚；
- **私有化部署兼容**：博客默认开启，但需保留模块开关，避免私有部署泄露主站内容；
- **构建强校验是把双刃剑**：内链校验会阻止发布引用不存在页面的文章——发文顺序需注意（先建被引用页）。
