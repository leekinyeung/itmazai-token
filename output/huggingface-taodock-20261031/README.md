---
language:
  - en
  - zh
tags:
  - taodock
  - api-gateway
  - developer-tools
---

# TaoDock — Connect your AI applications through one API gateway

[TaoDock](https://taodock.com/?utm_source=huggingface&utm_medium=readme&utm_campaign=taodock-introduction), known in Chinese as **众妙之门**, brings model access, API keys, and usage records into one console. Connect a compatible application to `https://taodock.com/v1`, choose a model available to your key, and start building.

## What you can build with TaoDock

- **Chat and assistant applications.** Use the OpenAI-compatible Chat Completions interface; select models that support streaming or tool calling when your workflow needs them.
- **Image workflows.** Choose an image-generation model and use its supported image endpoint.
- **Your existing workspace.** Follow the setup guides for Cherry Studio, Open WebUI, AionUI, DeepChat, and WorkBuddy, or connect through the TaoDock VS Code extension.
- **Separate access for each application.** Create individual API keys with quota limits, expiry, and access restrictions. Review request status and costs in the console's usage logs.

## Start with a model your key can access

1. [Create an account](https://taodock.com/sign-up) and check your balance and the [current model catalog](https://taodock.com/pricing).
2. Create a key on the [API Keys page](https://taodock.com/keys).
3. Set your application's OpenAI-compatible Base URL to `https://taodock.com/v1`. If it appends `/v1` itself, use `https://taodock.com` instead.
4. Query `/v1/models`, select a supported model, and send a short first request. Check the corresponding [usage record](https://taodock.com/usage-logs/common).

For a first connection check in Bash or Zsh, read your key without echoing it:

```bash
printf 'TaoDock API key: '
read -r -s TAODOCK_API_KEY
printf '\n'
export TAODOCK_API_KEY

curl --fail-with-body --silent --show-error \
  https://taodock.com/v1/models \
  -H "Authorization: Bearer $TAODOCK_API_KEY"
```

Use an exact `id` from the returned list. The [API guide](https://docs.taodock.com/api/overview.html) includes chat, streaming, Python, and JavaScript examples. Keep your key in your own backend or a trusted local client.

## Bring TaoDock into VS Code

The [TaoDock extension on Open VSX](https://open-vsx.org/extension/taodock/taodock) connects supported text models to VS Code's native language-model interface. It supports streaming responses and tool calling for compatible models. See the extension page for editor requirements and setup.

## 众妙之门 TaoDock：从一次调用到日常 AI 工作流

众妙之门 TaoDock 将模型接入、API 密钥和使用记录集中到一个控制台。无论是为自己的程序增加 AI 对话、连接桌面客户端，还是使用图片生成模型，都可以从同一平台开始配置。

- **程序接入：** OpenAI 兼容 Base URL 为 `https://taodock.com/v1`，按模型支持的协议选择对话、流式输出、工具调用或图片生成。
- **客户端接入：** 文档提供 Cherry Studio、Open WebUI、AionUI、DeepChat 和 WorkBuddy 的配置步骤；VS Code 用户也可安装已上架的 TaoDock 扩展。
- **密钥管理：** 为不同应用分别创建密钥，按需要设置额度、有效期和访问限制，便于管理与停用。
- **使用记录：** 在控制台查看请求状态与费用，完成首次调用后再逐步接入自己的工作流。

注册后，先检查账户余额和模型广场，再创建密钥。上方命令可查询该密钥实际可用的模型 ID，完整复制后填写到客户端或程序中。详细步骤见[快速开始](https://docs.taodock.com/quick-start.html)。

模型范围、接口能力和价格以当前目录及账号权限为准。生成请求会消耗账户额度，以实际结算记录为准。这个仓库提供 TaoDock 的接入介绍，不包含可下载的模型权重。

## Links / 常用入口

| Resource / 资源 | Link / 链接 |
| --- | --- |
| Product & console / 官网与控制台 | [taodock.com](https://taodock.com/?utm_source=huggingface&utm_medium=readme&utm_campaign=taodock-introduction) |
| Documentation / 使用文档 | [docs.taodock.com](https://docs.taodock.com/?utm_source=huggingface&utm_medium=readme&utm_campaign=taodock-introduction) |
| Models & pricing / 模型与价格 | [Model catalog](https://taodock.com/pricing) |
| Client setup / 客户端配置 | [Client guides](https://docs.taodock.com/guide/clients.html) |
| VS Code extension / 编辑器扩展 | [TaoDock on Open VSX](https://open-vsx.org/extension/taodock/taodock) |

Model availability, endpoint support, and pricing depend on the current catalog and your account permissions. Generation requests consume account credit. This repository contains an API gateway introduction and integration guidance; it does not host model weights.
