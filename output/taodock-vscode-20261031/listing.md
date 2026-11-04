# TaoDock for VS Code · 众妙之门

**Your TaoDock models, right where you code.**

Connect your [TaoDock](https://taodock.com) API key to the VS Code chat model picker. Choose an available GPT, Claude or other supported chat model, get streaming answers, and use tool-capable models with your editor's agent workflow.

**一个 TaoDock API 入口，把可用大模型带进你的开发工作流。**

写代码、读项目、梳理思路，无需为了切换模型反复更换 API 服务。众妙之门 TaoDock 将多模型接入、密钥管理和调用记录集中到一个平台；这个扩展让你在 VS Code 聊天界面直接选择账号可用的模型。

## Start in three steps / 三步开始

1. **Get your key / 获取密钥** — [Create a TaoDock account](https://taodock.com/sign-up), check your [balance](https://taodock.com/wallet) and [available models and pricing](https://taodock.com/pricing), then create an [API key](https://taodock.com/keys).
2. **Connect / 连接** — Open the Command Palette and run **TaoDock: Set or Replace API Key**. Paste your TaoDock API key. The extension validates it before saving it in VS Code Secret Storage.
3. **Choose a model / 选择模型** — In the chat model picker, open **Manage Models → TaoDock**, then select a TaoDock model for your conversation. Menu names can vary by editor version.

在中文界面，也可以运行 **TaoDock: 设置或更换 API 密钥**。密钥验证成功后，在聊天模型选择器中选择 TaoDock 下的模型即可开始。模型列表和访问权限随你的账号、密钥分组及平台服务配置而变化。

## What you get / 你可以用它做什么

- **Models available to your key.** Discovers models from `/v1/models` and checks the TaoDock catalog for Chat Completions support. Image, audio and other incompatible models stay out of the chat picker.
- **Streaming text.** Read responses as they arrive, and stop generation using the editor's cancellation controls.
- **Agent tool calls.** Models marked as tool-capable in the TaoDock catalog can return tool calls to the editor. Tool permissions and execution remain under your editor's control.
- **Secure key storage.** Keys are stored through VS Code Secret Storage. Authenticated requests use TaoDock's fixed HTTPS endpoint, with redirects disabled.
- **Seven interface languages.** English, 简体中文, 繁體中文, français, 日本語, русский and Tiếng Việt.

对于开发者，扩展把模型选择留在熟悉的编辑器里；对于经常尝试不同模型的用户，同一套 TaoDock 连接可以覆盖密钥有权使用的兼容聊天模型。调用情况可以回到 [TaoDock 请求日志](https://taodock.com/usage-logs/common)查询。

## Commands / 常用命令

| Command | Use |
| --- | --- |
| `TaoDock: Set or Replace API Key` | Connect or change your key / 设置或更换密钥 |
| `TaoDock: Refresh Models` | Reload available chat models / 刷新模型列表 |
| `TaoDock: Remove API Key from This Editor` | Delete the locally saved key / 移除当前编辑器保存的密钥 |
| `TaoDock: Open API Key Console` | Manage access and revoke keys / 管理和撤销密钥 |
| `TaoDock: Open Documentation` | Read integration guides / 查看接入文档 |

## Compatibility and billing / 兼容性与费用

- Requires **VS Code 1.104+**, or a compatible editor implementing the stable Language Model Chat Provider API and a chat interface that uses it. An Open VSX listing alone does not guarantee compatibility with every editor. Your editor's chat component may require its own installation or sign-in.
- This release supports **text chat and text-based tool results**. Image input, image/video generation and inline code completions are outside its scope.
- The platform does not expose model context limits through `/v1/models`. The extension uses a conservative editor budget of **28,672 input tokens and 4,096 output tokens**, with a byte-based input estimate. These are editor budgets, not claims about the models' maximum context. Output limits are not forced into API requests. Token estimates do not determine billing.
- Model calls consume TaoDock quota according to your account, key group and current pricing. Agent tasks can make multiple calls. Check the [pricing page](https://taodock.com/pricing) and [request logs](https://taodock.com/usage-logs/common).

扩展本身不收取订阅费；模型调用按 TaoDock 平台规则计费。是否能够使用某个模型、工具调用或特定客户端功能，以你的密钥权限、模型能力和编辑器支持情况为准。

## Privacy / 隐私

The extension sends your API key in an Authorization header to `https://taodock.com/v1/models` and `https://taodock.com/v1/chat/completions`. Conversations, code included in chat context, tool definitions and tool results are sent to TaoDock to process your selected model request. The public model catalog is fetched from `https://taodock.com/api/pricing` without your key.

The extension adds no analytics and writes neither API keys nor conversation content to its logs. Local diagnostic logs contain only operation names, outcomes and HTTP status codes. Platform data handling is governed by the policies available on [TaoDock](https://taodock.com).

密钥不会写入 `settings.json`，也不会通过本扩展写入工作区文件。编辑器传给模型的聊天上下文、代码和工具结果会发送到 TaoDock；请按项目要求选择可以提交给模型的内容。从编辑器移除密钥只会删除本地副本，如需全面停用，请在平台控制台撤销。

## Troubleshooting / 常见问题

- **401:** the key may be invalid, expired or disabled. Replace it with an active key from [API Keys](https://taodock.com/keys).
- **403 / access denied:** check account balance, the key's quota, group and model restrictions.
- **No models:** check key permissions and run **Refresh Models**. Both the model-list API and public TaoDock catalog must be reachable.
- **No TaoDock provider in chat:** confirm your editor supports the Language Model Chat Provider API and that the extension is enabled in a trusted workspace.
- **Incomplete response or timeout:** check request logs before retrying. The extension does not automatically retry generation requests.

**Ready to connect? / 开始使用：** [TaoDock](https://taodock.com) · [API Keys / API 密钥](https://taodock.com/keys) · [Models & Pricing / 模型与价格](https://taodock.com/pricing) · [Documentation / 使用文档](https://docs.taodock.com)

## License

AGPL-3.0-only. Corresponding source and build files are included in the VSIX package and maintained under `extensions/taodock-vscode` in the TaoDock project repository.
