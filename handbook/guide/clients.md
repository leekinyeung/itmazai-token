# 连接 AI 客户端

将客户端连接到 TaoDock，只需准备 **TaoDock API 地址、自己的 API 密钥、可用模型 ID**。先在 [API 密钥](https://taodock.com/keys)创建密钥；模型可在[模型广场](https://taodock.com/pricing)查找。

## 配置速查 {#settings}

| 客户端字段 | TaoDock 配置 |
| --- | --- |
| 服务商名称 | `TaoDock` |
| 服务商类型 / 协议 | OpenAI 兼容，用于普通文字对话 |
| API Key / 密钥 | 从 TaoDock「API 密钥」页面复制的完整密钥 |
| 首次测试模型 | `gpt-6.1-sol`，需在你的密钥可用模型列表内 |

**API 地址要按客户端的拼接规则填写，下面两种情况选择一种：**

| 客户端自动追加的路径 | 地址框中填写 |
| --- | --- |
| `/chat/completions` | `https://taodock.com/v1` |
| `/v1/chat/completions` | `https://taodock.com` |

两种写法最终都应得到同一个文字对话接口：`https://taodock.com/v1/chat/completions`。不要只凭「Base URL」或「API Host」这个字段名判断是否带 `/v1`，应查看客户端的拼接规则；Cherry Studio 和 Open WebUI 的具体填写方式见下文。

`https://docs.taodock.com` 用于阅读手册。客户端请求应发送到 `https://taodock.com`。

## 从控制台一键接入 {#import}

1. 在电脑上安装并启动需要使用的客户端。
2. 打开 [TaoDock API 密钥](https://taodock.com/keys)。
3. 找到要用于该客户端的密钥，打开该行右侧的操作菜单，进入「聊天」子菜单。
4. 选择客户端，例如 **Cherry Studio、AionUI 或 DeepChat**，按客户端弹出的导入提示完成配置。
5. 导入后确认服务地址为 TaoDock，并选择一个账号可用的对话模型发送短消息。

这些入口通过客户端的专用链接唤起本机应用。如果浏览器没有打开应用，先确认客户端已安装并允许打开该应用链接；仍不能导入时，按下面的手动配置操作。

## Cherry Studio 手动配置 {#cherry-studio}

1. 打开 Cherry Studio 的「设置 → 模型服务」。
2. 新增服务商，名称填写 `TaoDock`，选择 **OpenAI 兼容**类型。
3. 在 API Key 中添加从 TaoDock 复制的密钥。
4. 在 API 地址 / API Host 中填写 **`https://taodock.com`**。Cherry Studio 会为这一配置补齐 `/v1/chat/completions`。
5. 获取或同步模型列表，添加 `gpt-6.1-sol` 或其他账号可用的对话模型。
6. 保存并启用服务商，在聊天页选择该模型发送一条短消息。

如果你使用的版本要求填写带版本号的基础地址，可填写 `https://taodock.com/v1/`，但不要再手动附加 `chat/completions`。配置细节可对照 [Cherry Studio 模型服务说明](https://cherryai.com/docs/en/pre-basic/settings/providers/)。

## Open WebUI 配置 {#open-webui}

需要有 Open WebUI 的连接管理权限。

1. 打开 Open WebUI 的「Settings → Admin → Connections」。
2. 在 OpenAI 连接列表中添加连接，URL 填写 **`https://taodock.com/v1`**。
3. API Key 填写自己的 TaoDock 密钥，保存连接。
4. 验证连接并获取模型列表，选择一个可用对话模型。
5. 返回聊天页发起短消息测试。

如果模型没有自动显示，在该连接的 Model IDs 中添加从 TaoDock 模型列表复制的完整 ID。版本界面可对照 [Open WebUI 连接说明](https://docs.openwebui.com/getting-started/quick-start/connect-a-provider/starting-with-openai-compatible/)。

## 其他 OpenAI 兼容应用 {#other-clients}

客户端只追加 `/chat/completions` 时，填写 `https://taodock.com/v1`；客户端追加完整的 `/v1/chat/completions` 时，填写 `https://taodock.com`。两种情况最终对话请求地址都是：

```text
https://taodock.com/v1/chat/completions
```

选择 OpenAI 兼容协议时，可以使用 TaoDock 模型列表中支持这一协议的 Claude 模型，无需把域名改成其他服务商地址。使用 Claude 原生协议的应用则参考 [API 接口说明](../api/overview.md#endpoints)。

## 如何确认已经接入成功 {#verify}

- 客户端能收到模型的正常回复。
- [TaoDock 普通日志](https://taodock.com/usage-logs/common)出现相同时间和模型的请求记录。
- 钱包与密钥的剩余额度足够继续使用。

模型列表能加载，只能说明模型查询成功；完整的连接验证还需要实际发送一条消息。客户端的模型检测或测试消息可能产生模型用量。

## 连接失败先检查什么 {#troubleshoot}

| 现象 | 优先检查 |
| --- | --- |
| 返回网页或 404 | 是否填了文档站地址，或出现 `/v1/v1`、重复的完整接口路径 |
| 密钥无效 / 401 | 是否使用 TaoDock 密钥，是否完整复制，是否已停用或过期 |
| 模型不可用 | 模型 ID、协议、密钥模型限制和分组是否匹配 |
| 额度不足 | 同时检查钱包余额和密钥额度 |
| 无法打开一键导入 | 客户端是否已安装，浏览器是否允许打开应用链接 |

更多错误处理见[常见问题](../faq.md)。
