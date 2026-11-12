<div align="center">

![Taodock](web/public/logo.png)

# Taodock

**一个入口，接入多家大模型 —— 面向应用与 AI Agent 的统一 AI API 网关**

<p align="center">
  <a href="https://taodock.com">托管服务 taodock.com</a> •
  <a href="https://docs.taodock.com">使用手册</a> •
  <a href="#核心能力">核心能力</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#自托管部署">自托管部署</a> •
  <a href="#仓库结构">仓库结构</a>
</p>

<p align="center">
  <a href="./LICENSE">
    <img src="https://img.shields.io/badge/license-AGPL--3.0-brightgreen" alt="license">
  </a><!--
  --><img src="https://img.shields.io/badge/Go-1.26-00ADD8?logo=go&logoColor=white" alt="go">
  <!--
  --><img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="react">
  <!--
  --><img src="https://img.shields.io/badge/Docker-支持-2496ED?logo=docker&logoColor=white" alt="docker">
</p>

</div>

---

## 项目简介

Taodock 是一个自托管的 AI API 网关：把 OpenAI、Anthropic、Google Gemini、Azure OpenAI、AWS Bedrock、Vertex AI、DeepSeek、通义千问等上游模型服务接入同一个平台，对客户端统一暴露 OpenAI 兼容接口，并集中管理渠道路由、密钥访问、用量计费与日志审计。

它可以用来：

- 为团队或产品提供**统一的多模型 API 入口**，客户端只改一次 Base URL；
- 在网页控制台里**管理渠道、密钥、额度与订阅**，查看用量、成本与性能指标；
- 运营一个**公开的多模型服务平台**，自带模型广场、价格页、模型评测、排行榜等公开页面。

本项目基于开源项目 [New API](https://github.com/QuantumNous/new-api)（其源头为 [One API](https://github.com/songquanpeng/one-api)）二次开发，在此基础上新增了公开产品站点、模型评测体系、性能视图、VS Code 扩展与自动化发布流水线。上游关系与差异见[下文](#与上游-new-api-的关系)。

> [!IMPORTANT]
> - 本项目仅用于合法且经授权的 AI API 网关、组织级认证、多模型管理、用量分析与成本核算及私有部署场景。
> - 使用者须合法取得上游 API 密钥、账号与模型服务权限，并遵守上游服务条款及所在地的法律法规。
> - 以公开生成式 AI 服务或 API 转售形式运营时，请先完成所在地要求的备案、许可、内容安全、实名认证、日志留存、税务及上游授权等义务。

---

## 界面截图

以下为控制台界面示意，页面中的账号、渠道、用量与价格均为演示数据。

| 数据看板 | 模型广场 |
| --- | --- |
| [![数据看板：请求数、费用、Token、RPM/TPM 与性能健康](assets/screenshots/dashboard.zh-CN.jpg)](assets/screenshots/dashboard.zh-CN.jpg) | [![模型广场：模型可用性与定价](assets/screenshots/models.zh-CN.jpg)](assets/screenshots/models.zh-CN.jpg) |
| **用量日志** | **任务插件市场** |
| [![用量日志：Token、费用与响应时间](assets/screenshots/usage-logs.zh-CN.jpg)](assets/screenshots/usage-logs.zh-CN.jpg) | [![任务插件市场：图片视频等异步任务插件](assets/screenshots/plugin-marketplace.zh-CN.jpg)](assets/screenshots/plugin-marketplace.zh-CN.jpg) |

---

## 核心能力

| 领域 | 能力 |
| --- | --- |
| 模型接入 | OpenAI Chat Completions / Responses、Anthropic Messages、Gemini 原生协议；支持流式输出、工具调用、推理与多模态输入（取决于渠道与上游模型） |
| 渠道路由 | 模型映射、渠道优先级与权重、重试、会话亲和、多上游密钥轮转 |
| 用量与计费 | 额度、钱包与订阅、用量日志、缓存计费、按用量分档的表达式定价 |
| 访问控制 | 用户与分组、细粒度权限、密钥限制；支持 OAuth/OIDC、Passkey、两步验证与会话管理 |
| 异步任务 | 通过 JavaScript 任务插件扩展图片、视频等任务接口，含任务状态与结果查询 |
| 模型评测 | 内置评测工作器（DeepEval），对模型响应做相关性、正确性与忠实度评估 |
| 公开站点 | 模型广场、价格页、集成指南、模型对比、用量排行、模型评测、FAQ 等公开页面，含服务端 SEO 元数据与结构化数据 |
| Web 控制台 | 渠道与模型管理、用量与审计日志、Playground 试用；界面支持英、简中、繁中、法、日、俄、越 7 种语言 |

### 协议与端点

| 接口 | 常用端点 |
| --- | --- |
| OpenAI Chat / Responses | `POST /v1/chat/completions`、`POST /v1/responses` |
| Anthropic Messages | `POST /v1/messages` |
| Gemini | `POST /v1beta/models/{model}:generateContent`（及流式变体） |
| Realtime / Responses WebSocket | `GET /v1/realtime`、`GET /v1/responses`（WebSocket 升级） |
| 图片 / 音频 | `/v1/images/generations`、`/v1/images/edits`、`/v1/audio/speech`、`/v1/audio/transcriptions`、`/v1/audio/translations` |
| Embeddings / Rerank | `POST /v1/embeddings`、`POST /v1/rerank` |
| 任务插件 | `POST /v1/tasks/{pluginKey}`、`GET /v1/tasks/{taskId}`，及各插件声明路由 |

四种文本协议之间的请求、响应与流式转换由独立 Go 模块 [RelayKit](./relaykit/README.md) 完成。具体可用特性取决于渠道、上游模型与转换路径；协议特有字段不一定能精确映射，WebSocket 还需上游与渠道配置兼容。

---

## 快速开始

### 方式一：使用托管服务

1. 在 [taodock.com](https://taodock.com) 注册账号，在[钱包](https://taodock.com/wallet)确认余额；
2. 在[模型广场](https://taodock.com/models)查看可用模型与价格；
3. 在控制台[创建 API 密钥](https://taodock.com/keys)；
4. 把客户端 Base URL 指向 `https://taodock.com/v1`，使用平台签发的密钥调用：

```bash
curl --fail-with-body https://taodock.com/v1/chat/completions \
  -H "Authorization: Bearer ${TAODOCK_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"model":"your-enabled-model","messages":[{"role":"user","content":"Hello!"}]}'
```

客户端接入（Cherry Studio、Open WebUI、AionUI、DeepChat、OpenAI SDK 等）见[集成指南](https://taodock.com/integrations)与[使用手册](https://docs.taodock.com)。编辑器内使用可安装 [Taodock for VS Code](./extensions/taodock-vscode/README.md) 扩展。

### 方式二：本地 Docker 单机体验

单实例 + SQLite，绑定本机回环地址：

```bash
mkdir -p data
docker run --name taodock -d --restart unless-stopped \
  -p 127.0.0.1:3000:3000 \
  -e TZ=Asia/Shanghai \
  -v "$(pwd)/data:/data" \
  ghcr.io/leekinyeung/itmazai-token:latest
```

打开 [http://localhost:3000](http://localhost:3000) 完成初始化向导创建管理员账号；`data` 目录在容器替换后保留 SQLite 数据库。

首次调用：在控制台添加渠道（填入上游密钥与模型分组）→ 配置模型定价 → 创建 API 密钥 → 将客户端 Base URL 设为 `http://localhost:3000/v1`。验证：

```bash
curl --fail-with-body http://localhost:3000/v1/models \
  -H "Authorization: Bearer ${TAODOCK_API_KEY}"
```

---

## 自托管部署

### Docker Compose

仓库的 [docker-compose.yml](./docker-compose.yml) 默认启动 **应用 + PostgreSQL + Redis**，并附带 MySQL 与独立 ClickHouse 日志库的示例。镜像可使用本仓库 Dockerfile 自行构建，或直接拉取 `ghcr.io/leekinyeung/itmazai-token`。

启动前请编辑 `docker-compose.yml`：替换数据库与 Redis 示例密码，并设置持久化的随机 `SESSION_SECRET`（`openssl rand -hex 32` 生成）。启用 HTTPS 控制台时，配置 `SESSION_COOKIE_SECURE=true` 与精确的 `SESSION_COOKIE_TRUSTED_URL`。

```bash
git clone https://github.com/leekinyeung/itmazai-token.git
cd itmazai-token
docker compose up -d
docker compose logs -f new-api
```

### 存储与配置

| 组件 | 选项 |
| --- | --- |
| 主数据库 | SQLite、MySQL ≥ 5.7.8 或 PostgreSQL ≥ 9.6 |
| 独立日志库 | 通过 `LOG_SQL_DSN` 配置，另支持 ClickHouse |
| 缓存 | 可选 Redis + 内存缓存；多节点需共享限流时必须使用共享 Redis |
| 平台 | Linux amd64 / arm64 容器 |

| 变量 | 用途 |
| --- | --- |
| `SQL_DSN` | 主数据库连接；不设置则使用 SQLite |
| `LOG_SQL_DSN` | 可选独立日志库连接 |
| `REDIS_CONN_STRING` | Redis 连接串 |
| `SESSION_SECRET` | 持久化认证密钥；所有节点必须一致 |
| `CRYPTO_SECRET` | 默认取 `SESSION_SECRET`；共享 Redis 的节点须使用相同有效值 |
| `SESSION_COOKIE_SECURE` | HTTPS 控制台设为 `true`，启用 Secure Cookie 与严格来源校验 |
| `SESSION_COOKIE_TRUSTED_URL` | Secure 模式必填：逗号分隔的精确 HTTPS 来源，不含路径与通配符 |
| `TRUSTED_PROXIES` | 信任的反代 IP/CIDR，或 `none`；按网络环境显式配置 |

完整配置见 [环境变量示例](./.env.example)、[认证与会话指南](./docs/authentication.md)。

生产环境建议：控制台置于 HTTPS 反代之后并配置流式与 WebSocket 升级；持久化并备份数据库与挂载目录；多节点部署必须共享主数据库与认证密钥。升级前从 [Releases](https://github.com/leekinyeung/itmazai-token/releases) 固定镜像版本、评估迁移影响并先备份。

### CI/CD 自动发布（本仓库实践）

本仓库配备「合入 main 即发布、失败自动回滚」的 GitHub Actions 流水线，无需人工登录服务器：

```
PR ──► CI 质量门禁（go vet/build/test × 3 模块 + 前端 typecheck/test）    .github/workflows/ci.yml
main 合入 ──► Deploy production
        1. quality-gate   复用 CI 检查
        2. build          buildx 构建 sha-<12> 不可变镜像（含 SBOM）
        3. smoke          SQLite 容器冒烟验证 /api/status
        4. deploy         SSH 部署：pull → pg_dump 备份 → up → 健康检查（失败自动回滚）
        5. promote        成功后才把 latest 指向该 sha
线上异常 ──► Rollback production（一键回滚到指定 tag 或上一版本）          .github/workflows/rollback.yml
```

配置方法、服务器初始化与迁移注意事项见 [deploy/](./deploy/) 与 [CI/CD 运行手册](./docs/ci-cd.md)。

---

## 仓库结构

| 位置 | 职责 |
| --- | --- |
| `router/`、`middleware/`、`controller/` | HTTP 路由、访问控制、API 处理器与公开页面服务端渲染 |
| `relay/` | 上游适配与请求转发 |
| `service/`、`model/` | 业务逻辑与持久化 |
| [relaykit/](./relaykit/README.md) | 独立构建的 Go 模块：协议 DTO 与协议间转换 |
| [tokenkit/](./tokenkit/README.md) | 独立构建的 Go 模块：文本与图片 Token 计数与估算 |
| `tools/model-evaluation-worker/` | 模型评测工作器（Bun/TypeScript，对接 DeepEval），随镜像内置 |
| [plugins/tasks/](./plugins/tasks/) | JavaScript 任务插件，运行于 `pkg/jsplugin/`；编写规范见[任务插件 API v1](./docs/plugin-api/v1.md) |
| `web/` | React 19 + TypeScript 前端（控制台与公开站点）；约定见 [web/AGENTS.md](./web/AGENTS.md) |
| `handbook/` | VitePress 使用手册站，部署于 [docs.taodock.com](https://docs.taodock.com)，中英双语 |
| [extensions/taodock-vscode/](./extensions/taodock-vscode/README.md) | Taodock VS Code 扩展：把平台模型接入编辑器聊天 |
| `electron/` | 桌面端封装与打包 |
| `deploy/` | 生产部署编排（应用栈 / 基础设施栈 / 部署与初始化脚本） |
| `docs/` | 认证与安全、CI/CD、插件 API、OpenAPI 等工程文档 |

技术栈：后端 Go 1.26 + Gin + GORM；前端 React 19 + TypeScript + Rsbuild + TanStack + Tailwind CSS 4；前端包管理使用 Bun。

### 本地开发

先构建前端（后端内嵌 `web/dist`），再启动后端：

```bash
cd web
bun install --frozen-lockfile
bun run build
cd ..
go run .
```

另开终端启动前端开发服务器（代理 API 到 3000 端口）：

```bash
cd web && bun run dev -- --port 5173
```

也可使用 `make dev`（容器化后端 + 前端热更新），详见 [makefile](./makefile) 与 [docker-compose.dev.yml](./docker-compose.dev.yml)。

提交前请阅读 [AGENTS.md](./AGENTS.md)，并按改动范围运行检查：Go 侧 `make test`（覆盖根模块与 relaykit、tokenkit）；前端在 `web/` 下运行 `bun run typecheck`、`bun run lint`、`bun run test`、`bun run build`；RelayKit 改动还需在 `relaykit/` 下通过 `GOWORK=off go build ./...`。

---

## 与上游 New API 的关系

本仓库是 [QuantumNous/new-api](https://github.com/QuantumNous/new-api) 的下游发行版，持续跟进上游能力，并叠加了以下自有改动：

| 方面 | 本仓库的改动 |
| --- | --- |
| 公开产品站点 | 服务端渲染的模型广场、价格、集成、对比、排行、评测、FAQ 等页面，含 canonical/OG/sitemap/JSON-LD 等 SEO 基础设施 |
| 模型评测 | 内置 DeepEval 评测工作器与公开评测页，支持相关性 / 正确性 / 忠实度指标 |
| 性能视图 | 渠道与模型的性能健康指标、可用性统计与分享视图 |
| 品牌与计费细节 | Taodock 品牌呈现、模型身份展示、账单口径与日志导出调整 |
| 开发者工具 | [Taodock VS Code 扩展](./extensions/taodock-vscode/README.md)与[中英双语使用手册](https://docs.taodock.com) |
| 发布工程 | 不可变 `sha-<12>` 镜像、CI 质量门禁、自动备份、健康检查与一键回滚的完整流水线 |

---

## 许可与署名

本项目基于 [New API](https://github.com/QuantumNous/new-api) 开发，采用 [GNU Affero General Public License v3.0（AGPLv3）](./LICENSE)，并适用 AGPLv3 第 7 条附加条款：

- 修改版本须在相应的法律声明及界面的显著位置（关于、法律、页脚或署名处）保留署名声明：`Frontend design and development by New API contributors.`；
- 提供用户界面的修改版本须保留指向原始项目的可见链接：<https://github.com/QuantumNous/new-api>。

本项目基于 [One API](https://github.com/songquanpeng/one-api)（MIT License）发展而来。如你的组织政策不允许使用 AGPLv3 软件，请与上游联系获取商业授权。

第三方组件的归属与许可声明见 [NOTICE](./NOTICE) 与 [THIRD-PARTY-LICENSES.md](./THIRD-PARTY-LICENSES.md)。

---

<div align="center">

### 🚪 Taodock，玄之又玄

**[taodock.com](https://taodock.com)** • **[使用手册](https://docs.taodock.com)** • **[VS Code 扩展](./extensions/taodock-vscode/README.md)**

</div>
