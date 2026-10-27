# 选择模型和接口

在 [TaoDock 模型广场](https://taodock.com/pricing)查看当前模型。选择时要同时确认 **模型 ID、支持的接口、可用分组和价格**，不能只看模型的展示名称。

## 当前模型怎么选 {#catalog}

下表中的 ID 均来自 2026 年 10 月 26 日核对的 TaoDock 模型目录。

| 使用目标 | 可在模型广场查找的 ID | 接入方式 |
| --- | --- | --- |
| 文字对话、程序接入 | `gpt-6.1-sol`、`gpt-6-sol`、`gpt-6-luna` | OpenAI 兼容对话接口 |
| 使用 Claude 进行对话 | `claude-sonnet-4.6`、`claude-haiku-4-5` | OpenAI 兼容或 Anthropic Messages 接口 |
| 生成图片 | `gpt-image-2`、`gpt-image-2.5` | 图片生成接口，选择支持图片生成的应用 |

这不是完整清单。新增或调整的模型以[模型广场](https://taodock.com/pricing)实时展示为准；某把密钥实际可访问的 ID 应通过 `https://taodock.com/v1/models` 查询，方法见[快速开始](../quick-start.md#verify)。

## 模型 ID 要完整复制 {#model-id}

API 和客户端使用的是 ID。不要自行增删供应商前缀，也不要把 `claude-sonnet-4.6` 与 `claude-sonnet-4-6` 等不同写法互相替换；即使名称相似，也应使用列表中实际返回的那一个。

先完成一次简单文字对话，再启用工具调用、长上下文或其他高级功能。图片模型应按图片接口和对应应用的要求使用，不能仅凭模型名称把它当作普通文字模型测试。

## 分组与密钥有什么关系 {#groups}

TaoDock 使用分组区分模型可访问范围和服务配置。创建密钥时，分组下拉框显示当前账号可选择的选项。

- 首次接入先使用页面为账号提供的默认分组。
- 需要特定模型时，先确认该密钥所在分组能够访问它。
- 相同模型在不同分组下的价格和服务条件可能不同，切换前查看当前报价。
- 「自动」分组仅在账号可用且页面提供时使用，按界面展示的顺序和规则配置。

不要为了让模型显示而随意填写一个分组名称。具体密钥设置见[密钥管理](./api-keys.md#restrictions)。

## 按模型选择协议 {#protocol}

| 协议 | TaoDock 接口 | 适合的应用 |
| --- | --- | --- |
| OpenAI 兼容对话 | `https://taodock.com/v1/chat/completions` | 多数聊天客户端和通用应用 |
| Anthropic Messages | `https://taodock.com/v1/messages` | 要求 Claude 原生消息协议的应用 |
| 图片生成 | `https://taodock.com/v1/images/generations` | 支持图片生成协议的客户端或程序 |

模型支持哪些接口，应查看该模型在模型广场中的说明。协议不匹配时，更换应用的协议配置，而不是反复改变模型 ID 的拼写。
