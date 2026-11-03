---
title: "Open WebUI 接入自定义大模型 API 完整教程（附 Base URL 配置与排错） - 众妙之门 TaoDock"
titleTemplate: false
description: "在 Open WebUI 管理面板配置众妙之门 TaoDock OpenAI 兼容连接，填写 API 地址与密钥、获取模型并排查常见连接问题。"
---

# Open WebUI 接入众妙之门 API 配置教程

## 第一步：准备工作 {#prepare}

开始前，请准备[众妙之门 TaoDock API 密钥](https://taodock.com/keys)、足够的账户额度，并从[模型广场](https://taodock.com/pricing)复制完整模型 ID。首次使用可先完成[快速开始](../quick-start.md)。

需要有 Open WebUI 的连接管理权限。

<IntegrationConversionCallout />

1. 打开 Open WebUI 的「Settings → Admin → Connections」。
2. 在 OpenAI 连接列表中添加连接，URL 填写 **`https://taodock.com/v1`**。
3. API Key 填写自己的众妙之门 TaoDock 密钥，保存连接。
4. 验证连接并获取模型列表，选择一个可用对话模型。
5. 返回聊天页发起短消息测试。

如果模型没有自动显示，在该连接的 Model IDs 中添加从众妙之门 TaoDock 模型列表复制的完整 ID。版本界面可对照 [Open WebUI 连接说明](https://docs.openwebui.com/getting-started/quick-start/connect-a-provider/starting-with-openai-compatible/)。

## 验证一次真实请求 {#verify}

在客户端中选择众妙之门 TaoDock 连接下的模型，发送一条简短测试消息。确认收到正常回复，并在[普通日志](https://taodock.com/usage-logs/common)找到对应时间和模型的请求。加载模型列表只验证模型发现；发送消息可能消耗额度。

需要使用智能体时，还应按[文件工具验证步骤](./clients.md#agent-check)检查实际工具调用。普通文字回复不能代替工具能力检查。

## 常见问题排查 {#troubleshoot}

| 现象 | 优先检查 |
| --- | --- |
| 返回 HTML 或 404 | API 域名、协议选择，以及是否重复追加版本号或接口路径 |
| 401 或密钥无效 | 是否复制了完整、有效的众妙之门 TaoDock API 密钥 |
| 模型不存在或不可用 | 完整模型 ID、密钥模型限制与所属分组 |
| 提示额度不足 | 账户余额和 API 密钥额度 |
| 对话正常但工具失败 | 协议、模型能力及应用的工具权限 |

返回[客户端与 Agent 接入指南](./clients.md)，或查看[常见问题](../faq.md)继续排查。

<IntegrationConversionCallout />
