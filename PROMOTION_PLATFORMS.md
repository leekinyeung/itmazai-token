# Taodock 推广平台记录

记录 Taodock（众妙之门）的推广账号、已发布内容、引流入口和后续事项，便于继续维护及避免重复发布。

更新日期：2026-10-31，时区 Asia/Shanghai。状态以对应日期的发布结果或本地回执为准。

## 平台总览

| 平台 | 账号或标识 | 记录日期 | 状态 | 公开入口或本地材料 | 后续事项 |
| --- | --- | --- | --- | --- | --- |
| Zenn | `@taodock`，显示名称 Taodock | 2026-10-31 | 文章已发布，品牌资料已完善 | [账号主页](https://zenn.dev/taodock) · [已发布文章](https://zenn.dev/taodock/articles/cb532eed204483) | 后续文章沿用品牌资料和来源追踪规则 |
| Open VSX | 发布者 `taodock`，扩展 `taodock.taodock` | 2026-10-31 | 扩展 0.1.0 已上架，命名空间所有权申请已提交 | [扩展页面](https://open-vsx.org/extension/taodock/taodock) · [发布回执](output/taodock-vscode-20261031/publication-receipt.json) | 跟进命名空间审核，随版本更新扩展说明 |
| Hugging Face | Taodock 账号及仓库地址待记录 | 2026-10-31 | 介绍文案已准备，发布状态待核实 | [中英文介绍草稿](output/huggingface-taodock-20261031/README.md) | 确认登录、账号和发布结果后补充公开链接 |
| 抖音及巨量引擎 | 账号待记录 | 2026-10-28 | 素材暂停使用，推广准入待确认 | [发布文案及暂停说明](output/douyin-taodock-20261028/publishing-copy.txt) | 按实际经营内容核实平台类目、相关权利和资质，取得相应审核结果 |

## Zenn 发布记录

### 账号资料

| 项目 | 已保存内容 |
| --- | --- |
| 主页 | https://zenn.dev/taodock |
| 用户名 | `taodock` |
| 显示名称 | Taodock |
| 头像 | 沿用官网标志，源文件为 [web/public/logo.png](web/public/logo.png) |
| 官网链接 | https://taodock.com/?utm_source=zenn&utm_medium=profile&utm_campaign=taodock |
| 简介中的文档入口 | https://docs.taodock.com/en/ |

已保存的日文简介：

> Taodock（众妙之门）は、アプリとAIエージェント向けの統合AI APIサービスです。OpenAI互換APIでのモデル接続、ストリーミング、エラー対処などの実践ガイドを発信します。接続ガイド：https://docs.taodock.com/en/

### 已发布文章

| 项目 | 内容 |
| --- | --- |
| 标题 | OpenAI互換APIの接続をcurlで切り分ける：Base URL・モデルID・ストリーミング |
| 公开链接 | https://zenn.dev/taodock/articles/cb532eed204483 |
| 编辑入口 | https://zenn.dev/articles/cb532eed204483/edit |
| 发布日期 | 2026-10-31 |
| 语言及分类 | 日文，Tech |
| 标签 | Python、API、curl、OpenAI、llm |
| 内容形式 | 原创技术教程，文末介绍 Taodock 并提供接入入口 |
| 主题 | Base URL、模型 ID、认证错误排查、Python 调用、SSE 流式输出 |
| 参考文章 | https://zenn.dev/modelflare_dev/articles/da010b921b8b68 |

文末引流链接：

| 入口 | 链接 |
| --- | --- |
| 模型与价格 | https://taodock.com/pricing?utm_source=zenn&utm_medium=article&utm_campaign=api_connection_guide |
| API 密钥管理 | https://taodock.com/keys?utm_source=zenn&utm_medium=article&utm_campaign=api_connection_guide |
| API 接入文档 | https://docs.taodock.com/en/api/overview.html?utm_source=zenn&utm_medium=article&utm_campaign=api_connection_guide |

### 完成验证

- 已确认文章显示公开发布日期，未登录访问返回 HTTP 200。
- 已核对公开文章中的五个代码块与发布稿一致。
- 代码示例已完成 Bash 语法检查，以及 Python 正常响应、HTTP 错误、异常 JSON、缺失文本和超时等模拟验证；未将模拟验证描述为真实生成调用成功。
- 已确认公开主页显示品牌头像、Taodock 名称、完整日文简介、官网及文档链接。
- 已确认文章作者栏同步显示新简介和官网链接。
- 已确认文章链接保留来源追踪参数。参数用于标识来源，本记录尚无点击、注册或付费转化数据。

发布内容遵循 [Zenn 社区指南](https://zenn.dev/guideline)：正文提供技术信息，产品推广集中在文末。发布前已由用户确认核对稿件和指南。

## 其他平台材料与回执

### Open VSX

- 扩展版本：`taodock.taodock@0.1.0`。
- 上架时间：2026-10-31 11:33:50，Asia/Shanghai。
- [发布回执](output/taodock-vscode-20261031/publication-receipt.json)记录扩展可下载，公开包与本地包一致，公开介绍与验证稿一致。
- [命名空间所有权申请](https://github.com/EclipseFdn/open-vsx.org/issues/15036)已提交；[申请回执](output/taodock-vscode-20261031/namespace-claim-receipt.json)在 2026-10-31 记录为 `open`、命名空间尚未验证，等待管理员审核和授予 OWNER 权限。
- [扩展介绍](output/taodock-vscode-20261031/listing.md)包含官网、注册、模型价格、API 密钥和文档入口。

### Hugging Face

- 已准备中英文接入介绍，材料位于 [output/huggingface-taodock-20261031/README.md](output/huggingface-taodock-20261031/README.md)。
- 官网及文档链接采用 `utm_source=huggingface`、`utm_medium=readme`、`utm_campaign=taodock-introduction`。
- 已有[链接检查记录](output/huggingface-taodock-20261031/link-check.json)及登录交接截图；现有材料未留存 Taodock 公开仓库链接或发布成功回执，需补充确认。

### 抖音及巨量引擎

- 已有竖版海报草稿、发布文案和约 30 秒口播材料，制作日期为 2026-10-28。
- 现有[暂停说明](output/douyin-taodock-20261028/publishing-copy.txt)明确：此前未确认中转站及 API 转售业务的推广准入，因此素材暂停使用，海报仅保留为设计草稿。
- 后续应按实际经营内容完成类目、权利及资质核实，取得相应审核结果后再决定发布或投放。

## 后续记录方式

每次新增平台或发布内容时，更新平台总览，并补充账号、发布日期、公开链接、内容标题、引流链接及验证结果。将素材准备、登录完成、正式发布和审核通过分别记录，只有确认公开页面后才标记为已发布。

来源追踪参数统一使用平台名称作为 `utm_source`，使用 `profile`、`article` 或 `readme` 等入口类型作为 `utm_medium`，使用对应活动或内容名称作为 `utm_campaign`。取得统计数据后，按平台和内容补充点击、注册及转化结果。
