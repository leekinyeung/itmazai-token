# TaoDock 插件仓库矩阵进度

> **文档用途**：TaoDock GitHub 插件矩阵的唯一进度总表（Single Source of Truth）。
> **最后核对时间**：2026-11-11 20:20（GMT+8）
> **GitHub 组织**：<https://github.com/taodock-api>
> **本地工作目录**：`output/taodock-repos/`

## 1. 总体进度

| 仓库 | 仓库包装 | 分发渠道 | 自动化 | 当前状态 | 下一步 |
|---|---:|---:|---:|---|---|
| [`taodock-wordpress`](https://github.com/taodock-api/taodock-wordpress) | ✅ 完成 | ⏳ WordPress.org 待提交 | ✅ Verify 全绿 | **提审包已就绪** | 用 WordPress.org 账号上传 ZIP |
| [`taodock-n8n-nodes`](https://github.com/taodock-api/taodock-n8n-nodes) | ✅ 完成 | ✅ npm 0.1.1；⏳ n8n Verified | ⚠️ CI 正常；OIDC 首次发布未完成 | **等待修复 npm Trusted Publisher** | 让 OIDC 发布 0.1.2，再提交 n8n Creator Portal |
| [`taodock-ai-sdk`](https://github.com/taodock-api/taodock-ai-sdk) | ✅ 完成 | ✅ npm 0.1.0 | ⚠️ CI 正常；OIDC 尚未实发验证 | **已上线，自动发布待最终验证** | 配置 Trusted Publisher，OIDC 发布 0.1.1 |
| [`taodock-astrbot-plugin`](https://github.com/taodock-api/taodock-astrbot-plugin) | ✅ 完成 | ⏳ AstrBot 市场已提交，等待审核 | ✅ Validate 全绿 | **市场审核中** | 跟进审核反馈；通过后补市场页链接与徽章 |
| [`taodock-dify-tools`](https://github.com/taodock-api/taodock-dify-tools) | ✅ 完成 | ⏳ Dify Marketplace PR [#3728](https://github.com/langgenius/dify-plugins/pull/3728) 审核中 | ✅ Validate 全绿 | **v0.2.0 已提交市场审核** | 跟进自动检查和人工审核；通过后补市场页链接与徽章 |
| [`taodock-mcp`](https://github.com/taodock-api/taodock-mcp) | ✅ 完成 | ✅ npm 0.2.0 + 官方 MCP Registry | ✅ Validate / npm / Registry | **首次正式发布完成** | 补 GitHub Release 与 MCPB，并向下游目录扩散 |
| [`dify-plugins`](https://github.com/taodock-api/dify-plugins) | — | — | — | **参考仓库，不纳入改造任务** | 仅作为 Dify 插件结构参考 |

**任务完成度：6 / 6 个业务仓库已完成基础包装（100%）。**
“完成基础包装”指 README、GitHub description、topics 和必要的发布说明已处理；不代表官方市场提审已经完成。

---

## 2. 仓库详细状态

### 2.1 taodock-wordpress

**定位**：WordPress 7.0+ AI Client 的 TaoDock Provider。一个 API Key 调用 GPT、Claude、Gemini 等 40+ AI 提供商。

#### 已完成

- 重写 GitHub README：徽章、Quick Start、功能列表、数据流、FAQ、隐私说明、兄弟仓库交叉链接。
- GitHub description 已设置。
- 已设置 10 个 topics：`wordpress-plugin`、`wordpress`、`ai`、`llm`、`api-gateway`、`openai-compatible` 等。
- 展示名改为：**TaoDock AI – 40+ AI Models (GPT, Claude, Gemini)**。
- slug 保持：`taodock-ai-provider`。
- WordPress.org 提审预检通过：
  - CI Verify 全绿；
  - PHP 语法 / PHPCS / WordPress 7.0 与 7.1 回归检查通过；
  - `Stable tag` 与插件版本均为 `1.0.0`；
  - 图标为 256×256 PNG；
  - GPLv2 or later；
  - 外部服务与隐私声明齐全；
  - ZIP 结构合规。
- 最新主分支提交：`4df9386`。
- 最新 Verify 工作流：成功（run `42145958004`）。

#### 交付物

- 提审包：`output/taodock-repos/taodock-wordpress/dist/taodock-ai-provider.zip`

#### 待办 / 阻塞

- **P0**：尚无已完成 WordPress.org 提交的记录。需要用自有 WordPress.org 账号在插件提交表单上传 ZIP：
  <https://wordpress.org/plugins/developer/plugin-submission/>
- 审核通过后：提交 SVN、补 772×250 banner、将插件 URI 更新为正式插件页。

---

### 2.2 taodock-n8n-nodes

**定位**：n8n 社区节点，支持文本、图片、视频生成；模型列表根据 API Key 权限自动发现；可作为 AI Agent Tool 使用。

#### 已完成

- 重写 README：徽章、三种安装方式、操作表、示例工作流、隐私说明、兼容性和兄弟仓库链接。
- GitHub description 已设置。
- 已设置 10 个 topics：`n8n`、`n8n-community-node`、`workflow-automation`、`image-generation`、`video-generation` 等。
- npm 包已发布：[`n8n-nodes-taodock`](https://www.npmjs.com/package/n8n-nodes-taodock)。
- npm 正式线上版本：**0.1.1**，`latest → 0.1.1`。
- 0.1.1 通过 GitHub Actions 发布，带 npm provenance，满足 n8n Verified Node 的关键要求。
- lint、typecheck、8 个测试、build 均通过。
- 清理发布包中的 `tsconfig.tsbuildinfo`，tarball 从 38.1 kB 降到约 16 kB。
- 官方扫描器的 provenance check 已通过；静态检查无环境变量、文件系统、子进程或动态执行风险。
- n8n Verified Node 提审材料已整理：`output/n8n-verified-node-提审包-20261106.md`。
- 当前 Validate 工作流全绿（最近 runs `42180482541`、`42180444731`）。

#### 当前版本差异

| 位置 | 版本 |
|---|---:|
| GitHub `package.json` | **0.1.2** |
| npm registry `latest` | **0.1.1** |
| `v0.1.2` tag | 已创建 |
| 0.1.2 发布结果 | **失败，未进入 npm** |

因此，不能把 0.1.2 标记为已上线；用户安装到的仍是 0.1.1。

#### Trusted Publishing / OIDC 排障结论

仓库工作流已完成以下修复：

- `permissions.id-token: write`；
- Node 22.14.0；
- npm CLI ≥ 11.5.1；
- 移除 `NODE_AUTH_TOKEN`；
- 移除 `actions/setup-node` 的 `registry-url`（否则会生成空 `_authToken`，抢先于 OIDC）；
- 发布前删除可能残留的 registry auth 配置；
- dry-run 改为 `npm pack --dry-run`；
- 增加 staged publishing 诊断路径。

最终 verbose 日志显示：

```text
POST /-/npm/v1/oidc/token/exchange/package/n8n-nodes-taodock → 404
OIDC token exchange error - package not found
```

这说明 GitHub OIDC 环境与令牌生成正常，但 npm 服务端没有为 `n8n-nodes-taodock` 找到匹配的 Trusted Publisher 记录。不是代码、构建或 provenance 失败。

#### 待办 / 阻塞

- **P0**：在 `n8n-nodes-taodock` 的 npm 包 Settings 中重新确认 Trusted Publisher 已真正保存：
  - Owner：`taodock-api`
  - Repository：`taodock-n8n-nodes`
  - Workflow：`publish.yml`
  - Environment：留空
  - Allowed actions：允许 `npm publish`
- 推荐用有交互式 2FA 会话的最新 npm CLI 创建并回读：

```bash
npm trust github n8n-nodes-taodock \
  --repo taodock-api/taodock-n8n-nodes \
  --file publish.yml \
  --allow-publish \
  --yes

npm trust list n8n-nodes-taodock
```

- Trusted Publisher 生效后，重新手动触发 Publish workflow（`dry_run=false`、`stage_only=false`）发布 0.1.2。
- 0.1.2 上线并验证 provenance 后，再向 <https://creators.n8n.io/nodes> 提交 Verified Node。
- 提审时将 TaoDock 表述为“单一账号、单一 Key、单一 API 端点的统一 AI 服务”，避免被误判为多个不相关服务的代理包。

---

### 2.3 taodock-ai-sdk

**定位**：TaoDock 的 Vercel AI SDK Provider，支持文本生成、流式输出、结构化输出与 usage accounting。

#### 已完成

- README 重写为英文主文档 + 独立中文说明。
- 新增 badges、Why use this provider、`generateText`、`streamText`、`generateObject` 示例、配置表、兼容性与场景表。
- `package.json` keywords 从 5 个扩充到 15 个。
- GitHub description 已设置。
- 已设置 10 个 topics：`ai-sdk`、`vercel-ai-sdk`、`openai-compatible`、`streaming`、`typescript` 等。
- npm 包名统一为：[`@taodock-ai/ai-sdk-provider`](https://www.npmjs.com/package/@taodock-ai/ai-sdk-provider)。
- npm 正式线上版本：**0.1.0**，`latest → 0.1.0`。
- 实际安装验证通过，导出项包括：`TAODOCK_BASE_URL`、`createTaoDock`、`taodock`。
- CI 全绿（最近 run `42180458127`）。
- 发布工作流已同步 n8n 仓库的 OIDC 修复：无 `registry-url`、无 token、带 auth 残留守卫、支持 staged publishing 与本地 pack dry-run。

#### 待办 / 阻塞

- **P1**：在 npm 包 Settings 配置 Trusted Publisher：
  - Owner：`taodock-api`
  - Repository：`taodock-ai-sdk`
  - Workflow：`publish.yml`
  - Environment：留空
  - Allowed actions：允许 `npm publish`
- 配置后发布 0.1.1，确认 OIDC、provenance 和 `latest` 标签正常。
- 成功后删除 GitHub 仓库中的 `NPM_TOKEN` secret，并在 npm 包设置中考虑开启 “Require 2FA and disallow tokens”。

---

### 2.4 taodock-astrbot-plugin

**定位**：AstrBot 的 TaoDock AI 图片与视频生成插件，支持按 API Key 发现可用模型及恢复长时间运行的视频任务。

#### 已完成

- 重写 README：品牌区与徽章、安装方式、Quick Start、6 个命令、配置表、参数示例、数据流、故障排查、隐私安全、开发说明、中文说明和兄弟仓库交叉链接。
- 市场展示名优化为 **TaoDock AI Image & Video**；中英文 `display_name`、`short_desc` 和 `desc` 已同步。
- GitHub description 已设置。
- 已设置 10 个 topics：`astrbot`、`astrbot-plugin`、`image-generation`、`video-generation`、`generative-ai`、`python` 等。
- 新增 `validate.yml`：Python 3.10/3.12、Ruff lint/format、6 个单元测试、metadata 校验、16 MiB 市场包限制。
- 本地验证：6/6 单测通过，Ruff 全绿，metadata/JSON 有效。
- Logo 为官方推荐的 256×256 PNG。
- 市场 ZIP 约 91.4 KiB，远低于 16 MiB 上限。
- GitHub Actions Validate run `42740906037` 成功。
- 提审材料：`output/astrbot-plugin-市场提审清单-20261110.md`。
- **2026-11-11：已提交 AstrBot 插件市场，当前等待官方审核。**

#### 待办 / 阻塞

- **P0**：关注 AstrBot 市场审核结果，并及时处理审核反馈。
- **P1**：准备限额审核 API Key，至少开放一个低成本图片模型；若审核方索要测试凭据，再按最小权限提供并在审核结束后撤销。
- 审核通过后记录正式市场页链接，补市场徽章，并建设 TaoDock 官网 `/integrations/astrbot` 落地页。

---

### 2.5 taodock-dify-tools

**定位**：Dify 的 TaoDock AI 图片与视频工具插件，支持授权模型发现、图片生成、异步视频生成、任务查询和视频下载。

#### 已完成

- 重写英文主 README：品牌区、徽章、安装、Quick Start、5 个工具、两类工作流示例、数据流、权限边界、兼容性、故障排查和兄弟仓库链接。
- 中文说明扩展至 `readme/README_zh_Hans.md`；英文主 README 已验证不含 CJK 字符。
- Marketplace 展示名优化为 **TaoDock AI Image & Video**，manifest 与 Provider 元数据已同步。
- 扩充 `PRIVACY.md`：明确发送字段、用途、插件/Dify 两侧留存边界、固定出站域名和安全边界。
- GitHub description 已设置。
- 已设置 10 个 topics：`dify`、`dify-plugin`、`image-generation`、`video-generation`、`workflow-automation`、`ai-agent` 等。
- 强化 `validate.yml`：锁定依赖安装、10 个单测、Python 编译、Marketplace 元数据、英文 README、隐私披露、包内容和大小检查。
- 本地验证：10/10 单测通过，Python 编译通过，manifest/README 校验通过。
- 固定出站域名仅为 `taodock.com`；无任意 URL、命令/代码执行、SQL、浏览器自动化或主机文件操作。
- 预打包检查：29 个运行文件、约 1.0 MiB，无凭据、虚拟环境、测试或缓存文件。
- 最新 Validate run `42976659098` 成功。
- 提审材料：`output/dify-marketplace-提审清单-20261111.md`。
- 已确认旧版 `0.1.2` 曾通过 PR [#3649](https://github.com/langgenius/dify-plugins/pull/3649) 合并，因此本次按 **Version update** 提交。
- 使用官方 Dify Plugin CLI `v0.6.15` 构建正式包：`output/taodock_media-0.2.0.difypkg`。
- 正式包：30 个运行文件，必需文件齐全，无测试、缓存、虚拟环境、`.env` 或可执行二进制；最终 SHA-256：`40e7c0e28aae843d608794526a5699be32516b41702de4a973a19343964bac9a`。
- 已向 `langgenius/dify-plugins` 提交版本更新 PR [#3728](https://github.com/langgenius/dify-plugins/pull/3728)：新增 `taodock_media-0.2.0.difypkg`，并按上游最新规则移除仓库中的旧版 `0.1.2` 包。
- PR 风险级别选择 **Medium risk**。首次治理检查提示 manifest 缺少受控 `tags`，已在源码及包中补充 `image`、`videos`；随后按治理提示移除旧版包。最终 4 项自动检查全部通过，等待人工审核。

#### 待办 / 阻塞

- **P0**：跟进 PR [#3728](https://github.com/langgenius/dify-plugins/pull/3728) 自动检查和人工审核反馈，在原 PR 上修复。
- **P1**：审核通过后补 Marketplace 徽章与正式页面链接，并在 TaoDock 官网建立 `/integrations/dify` 落地页互链。

---

### 2.6 taodock-mcp

**定位**：本地 stdio MCP Server，让 Claude Desktop、Cursor、VS Code、Gemini CLI 等客户端发现授权模型并完成图片生成、异步视频生成、状态查询和媒体下载。

#### 已完成

- 全面重写 README：徽章、Requirements、Quick Start、Claude Desktop / Cursor / VS Code / Gemini CLI 配置、环境变量、5 个工具、计费与本地文件副作用、源码运行、安全隐私、故障排查和兄弟仓库链接。
- npm 包名统一为 `@taodock-ai/mcp-server`，与现有 npm 组织 scope 一致；`server.json` 同步更新。
- `package.json` 增加 keywords、`publishConfig`、`prepack`、`validate`、`start`，确保干净 checkout 发布前自动 typecheck、测试和构建。
- 新增 `validate.yml`：Node 20.11 / 22 矩阵、typecheck、9 个单测、build、npm pack 和版本一致性检查。
- 新增 `publish-npm.yml`：支持 dry-run 与 tag 发布、OIDC provenance、tag/version 校验。
- 强化 `publish-registry.yml`：发布前回读 npm 版本，只有 npm 包存在才发布 MCP Registry 元数据。
- MCPB 构建补充 `TAODOCK_LOCALE`；`server.json` 补充完整环境变量说明。
- 安全边界强化：自定义 API 地址只允许 HTTPS 且禁止内嵌凭据；图片 URL 只允许 HTTPS、拒绝重定向、校验 image MIME、限制 25 MiB；移除未经验证的图片编辑声明。
- 扩充 `PRIVACY.md`：披露自定义端点、公共目录请求、媒体主机网络元数据、本地绝对路径、内联 base64 和文件不自动删除。
- 本地验证：typecheck 通过，9/9 单测通过，npm audit 0 漏洞；npm tarball 仅 5 个文件、约 12.8 kB；MCPB schema 验证通过，产物约 316.9 kB。
- GitHub description 与 10 个 topics 已设置。
- 主分支最新远程提交：`73afe70`；Validate run `42995321123` 的 Node 20.11 / 22 两个任务均通过。
- npm 首次发布完成：[`@taodock-ai/mcp-server@0.2.0`](https://www.npmjs.com/package/@taodock-ai/mcp-server)，`latest` 指向 0.2.0。
- 首次 OIDC 发布因工作流使用 Node 22 自带 npm 10 而报 `ENEEDAUTH`；已把工作流升级为 Node 22.14 + npm >=11.5.1，并清理可能遮蔽 OIDC 的 registry 凭据。由于 npm 不允许为不存在的包保存首次 Trusted Publisher，0.2.0 先用现有维护者凭据完成首发，后续版本可验证 OIDC provenance。
- 官方 MCP Registry 发布成功：[`io.github.taodock-api/mcp-server` 0.2.0](https://registry.modelcontextprotocol.io/v0/servers/io.github.taodock-api%2Fmcp-server/versions/0.2.0)，状态 `active` 且 `isLatest=true`；工作流 run `43018001559` 已通过。
- 已创建 [GitHub Release v0.2.0](https://github.com/taodock-api/taodock-mcp/releases/tag/v0.2.0)，附带 Claude Desktop 安装包 `taodock-mcp-0.2.0.mcpb`（324,544 bytes，SHA-256 `607dd20a01fade046316a6fe229836c1ea830e97f19aad26c67e107e733181a6`）。
- README 已改为直接链接最新 Release；MCPB manifest 同步移除未经验证的“图片编辑”表述。远程 main 最新提交 `9e4e6fa`，Validate run `43019482299` 通过。

#### 待办 / 阻塞

- **P1**：再次确认 npm 包设置中的 Trusted Publisher 已保存；下个版本用修复后的工作流验证 OIDC provenance。
- **P1**：向 Smithery、PulseMCP、Glama 等下游目录提交，并在目录页回链 TaoDock。

---

## 3. 当前优先级队列

### P0：必须先处理

1. 修复 `n8n-nodes-taodock` 的 npm Trusted Publisher 记录，发布 0.1.2。
2. 提交 n8n Verified Node（0.1.2 上线并验证 provenance 后）。
3. 上传 WordPress 插件 ZIP 到 WordPress.org。
4. 跟进 `taodock-astrbot-plugin` 的 AstrBot 市场审核反馈。
5. 跟进 `taodock-dify-tools` 的 Dify Marketplace PR [#3728](https://github.com/langgenius/dify-plugins/pull/3728) 审核。
6. 确认 `@taodock-ai/mcp-server` Trusted Publisher 在首发后已保存，为下个版本验证 OIDC provenance。

### P1：随后处理

1. 配置 `@taodock-ai/ai-sdk-provider` Trusted Publisher，OIDC 发布 0.1.1。
2. 两个包完成 OIDC 首发后，删除 GitHub `NPM_TOKEN` secrets，并撤销旧 npm granular token。
3. 向 AstrBot、Dify、MCP 官方/主流目录提交插件。
4. TaoDock 官网建设 `/integrations/` 落地页矩阵，与 GitHub、npm 和市场页双向互链。

### P2：运营增强

1. 为每个仓库增加截图、GIF 或短视频 demo。
2. 增加 Release notes、CHANGELOG 和 Issue templates。
3. 监测 GitHub stars、npm weekly downloads、市场安装量、官网 referral 注册和首充转化。

---

## 4. SEO 与推广状态

### 已获得的搜索入口

- GitHub 仓库页：WordPress、n8n、AI SDK 三个仓库已补 description 和 topics。
- npm 包页：
  - <https://www.npmjs.com/package/n8n-nodes-taodock>
  - <https://www.npmjs.com/package/@taodock-ai/ai-sdk-provider>

### 尚缺的高价值入口

- WordPress.org 插件页（最高优先级）。
- n8n Verified Community Node 目录与 n8n Cloud 安装入口。
- Dify Marketplace。
- AstrBot 插件市场（已提交，等待审核；通过后补正式市场页链接）。
- Smithery / PulseMCP 等 MCP 注册表。
- TaoDock 官网 `/integrations/wordpress`、`/integrations/n8n`、`/integrations/ai-sdk`、`/integrations/dify`、`/integrations/astrbot`、`/integrations/mcp` 页面。

### 监测指标

| 渠道 | 指标 |
|---|---|
| GitHub | Stars、Forks、Clone、README 链接点击 |
| npm | Weekly downloads、版本采用率、provenance 状态 |
| 官方市场 | 收录状态、安装量、评分、审核反馈 |
| Google Search Console | `taodock + integration` 品牌词展现、integration 长尾词排名 |
| GA4 | GitHub/npm/市场 referral → 注册 → 首充转化 |

---

## 5. 关键交付物索引

| 文件 | 用途 |
|---|---|
| `output/taodock-repos/taodock-wordpress/dist/taodock-ai-provider.zip` | WordPress.org 提审包 |
| `output/n8n-verified-node-提审包-20261106.md` | n8n Verified Node 表单填写与合规材料 |
| `output/npm-trusted-publishing-配置清单.md` | npm Trusted Publishing 配置说明 |
| `output/astrbot-plugin-市场提审清单-20261110.md` | AstrBot 市场表单文案、检查结果和审核测试步骤 |
| `output/dify-marketplace-提审清单-20261111.md` | Dify Marketplace PR 文案、风险披露、构建与提交步骤 |
| `output/taodock-repos/` | 各仓库本地工作副本 |
| `docs/taodock-repository-progress.md` | 本进度总表 |

---

## 6. 更新本文件时的核对清单

每次处理完一个仓库或发布动作后，更新“最后核对时间”，并至少核对以下事实：

```bash
# GitHub 元数据与最新提交
gh api repos/taodock-api/<repo>
gh api repos/taodock-api/<repo>/topics
gh api repos/taodock-api/<repo>/commits/main

# GitHub Actions
gh run list --repo taodock-api/<repo> --limit 5

# npm 实际线上版本（以 registry 为准，不以 package.json 为准）
npm view n8n-nodes-taodock version dist-tags
npm view @taodock-ai/ai-sdk-provider version dist-tags
```

状态标记统一使用：

- ✅ 已完成并在线验证；
- ⏳ 已准备或等待外部审核/用户操作；
- ⚠️ 部分完成或存在阻塞；
- ❌ 尚未开始或缺失必要能力。

**原则：源码版本不等于已发布版本；只有 registry / 官方市场可查询到的版本才标记为已上线。**
