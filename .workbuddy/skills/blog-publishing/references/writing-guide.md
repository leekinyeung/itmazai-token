# SEO 写作规范

读者画像：正在评估 AI 网关/中转方案的开发者与技术决策者。目标：每篇文章服务**一个搜索意图**，并能承接产品转化。

## 选题与关键词

- 每篇只攻一个 `primaryKeyword`；选题前先查 `docs/blog-seo-plan.md` §7 的 cluster 规划（选型 / 成本优化 / 接入教程 / 模型动态 / 稳定性），让文章落入已有专题便于互链。
- 标题公式：主关键词 + 新鲜度/形态词。例：「How to Choose an AI Gateway **in 2026**: **A Practical Checklist**」。年份每年可更新续命。
- description 前 40 字符内出现主关键词，剩余部分列举文章覆盖的维度（80–180 字符硬限制）。

## 正文结构（已被验证的模板）

1. **开头段**（不加标题）：前两句直接给出核心答案，全段 ≤100 词——这是抢 Google 精选摘要（Featured Snippet）的位置，不铺垫行业背景。
2. **定义节** `## What ... actually does`：2–3 句定义 + 一句「什么时候不需要」——敢说不需要才客观。
3. **总览节** `## ... at a glance`：一张 5–7 行的 Markdown 表格，30 秒可扫读；这是被分享引用最多的部分。
4. **维度小节**（每节 150–200 词，统一三段式）：
   - 它是什么（1 句定义）
   - 怎么验证（可操作动作，如 "Create a test key, set a small budget, and confirm requests are rejected once it is spent"）
   - 好坏标准（明确合格线，如 "A good gateway fails over in seconds without billing you twice"）
5. **对比节**（对比表，植入自家产品事实优势，不写营销话术——对比页才是转化场）。
6. **反模式节** `## Common mistakes ...`：3–4 条 `###` 小标题 + 2–3 句，建立专业可信度。
7. **收尾节** `## Next steps`：2–3 句 + 指向 `/models`、`/compare/*` 等转化页的内链。

## 硬指标

- 总词数 **1300–1500**（统计方式：去掉 frontmatter 与 Markdown 符号后的英文单词数）。
- 主关键词自然出现在：首段、至少 2 个 H2 标题、结尾段。
- `faqItems` 3–5 条，瞄准 People Also Ask（What is... / Do I need... / How much... / Can I...），答案 2–3 句直答。
- 内链 ≥3 条，刻意搭配：1 条 cluster 内姊妹文或 Hub、1 条 `/compare/*` 决策页、1 条产品页（`/models` 或 `/integrations/*`）。
- `sources` 引官方文档（OpenAI、竞争对手官方文档等），支撑 E-E-A-T。
- 不编造 benchmark 数字；只写可复现的验证方法。

## 语言与风格

- 英文正文（站点公开内容一期为英文单语），practitioner-to-practitioner 语气，短句优先。
- 具体、可执行、敢说判断；避免 "In today's fast-paced world" 类填充句。
