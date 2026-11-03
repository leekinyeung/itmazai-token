---
title: "AI 客户端与 Agent 接入指南"
description: "选择适合的众妙之门 TaoDock 接入方式，查看 Cherry Studio、WorkBuddy、Open WebUI、AionUI 和 DeepChat 的配置与排错指南。"
---

# 客户端与 Agent 工具接入

将客户端连接到众妙之门 TaoDock，只需准备 **众妙之门 TaoDock API 地址、自己的 API 密钥、可用模型 ID**。先在 [API 密钥](https://taodock.com/keys)创建密钥；模型可在[模型广场](https://taodock.com/pricing)查找。

## 选择你的工具 {#tools}

| 工具 | 众妙之门 TaoDock 接入方式 | 教程 |
| --- | --- | --- |
| Cherry Studio | 控制台一键导入，或在模型服务中手动配置 | [导入与使用智能体](./cherry-studio.md) |
| WorkBuddy 桌面版 | 在应用内添加自定义模型 | [手动接入众妙之门 TaoDock](./workbuddy.md) |
| AionUI | 控制台一键导入，或添加自定义模型 | [导入与选择内置 Agent](#aionui) |
| DeepChat | 控制台一键导入，或添加 OpenAI 兼容服务商 | [导入与启用模型](#deepchat) |
| Open WebUI | 在管理界面添加 OpenAI 连接 | [连接配置](./open-webui.md) |

本页的「导入」是将众妙之门 TaoDock 的模型连接交给应用使用。智能体的工作目录、技能、MCP 和操作权限，需要在对应应用中另外设置。客户端界面随版本变化，下面按桌面版说明；各节附有官方下载或说明链接。

操作截图可点击放大。截图中的 API 密钥已遮罩或留空，配置时请粘贴你自己的众妙之门 TaoDock 密钥；模型列表以你的账号实际可用范围为准。

## 配置速查 {#settings}

| 客户端字段 | 众妙之门 TaoDock 配置 |
| --- | --- |
| 服务商名称 | `众妙之门 TaoDock` |
| 服务商类型 / 协议 | OpenAI 兼容，用于普通文字对话 |
| API Key / 密钥 | 从众妙之门 TaoDock「API 密钥」页面复制的完整密钥 |
| 首次测试模型 | `gpt-6.1-sol`，需在你的密钥可用模型列表内 |

**API 地址要按客户端的拼接规则填写，下面两种情况选择一种：**

| 客户端自动追加的路径 | 地址框中填写 |
| --- | --- |
| `/chat/completions` | `https://taodock.com/v1` |
| `/v1/chat/completions` | `https://taodock.com` |

两种写法最终都应得到同一个文字对话接口：`https://taodock.com/v1/chat/completions`。不要只凭「Base URL」或「API Host」这个字段名判断是否带 `/v1`，应按下面对应工具的步骤填写。

`https://docs.taodock.com` 用于阅读手册。客户端请求应发送到 `https://taodock.com`。

## 从控制台一键接入 {#import}

1. 在电脑上安装并启动需要使用的客户端。
2. 打开 [众妙之门 TaoDock API 密钥](https://taodock.com/keys)。
3. 找到要用于该客户端的密钥，打开该行右侧的操作菜单，进入「聊天」子菜单。
4. 选择客户端，例如 **Cherry Studio、AionUI 或 DeepChat**，按客户端弹出的导入提示完成配置。
5. 在应用内确认 API 域名为 `taodock.com`、密钥已填写，再保存并启用服务商。名称可能显示为 **New API**，可按应用支持情况改成 `众妙之门 TaoDock`，方便识别。
6. 获取或添加模型，回到会话中明确选择该服务商下的模型，再发送短消息。

这些入口通过客户端的专用链接唤起本机应用。如果浏览器没有打开应用，先确认客户端已安装并允许打开该应用链接；仍不能导入时，按下面的手动配置操作。

导入链接包含所选密钥，只用于打开你自己的客户端，不要转发给他人。若应用提示将覆盖已有服务商配置，先核对原配置是否仍需保留。**目前众妙之门 TaoDock 没有 WorkBuddy 一键导入入口**，请使用下方自定义模型教程。

## Cherry Studio 导入与配置 {#cherry-studio}
请打开独立的[Cherry Studio 接入众妙之门：导入与 API 配置](./cherry-studio.md)，查看配置步骤、成功验证和错误排查。

## WorkBuddy 自定义模型接入 {#workbuddy}
请打开独立的[WorkBuddy 自定义模型接入众妙之门教程](./workbuddy.md)，查看配置步骤、成功验证和错误排查。

## AionUI 导入与配置 {#aionui}

### 第一步：准备工作 {#aionui-prepare}

从 [AionUI 官方发布页](https://github.com/iOfficeAI/AionUi/releases)安装应用。

<IntegrationConversionCallout />

### 一键导入

1. 在众妙之门 TaoDock 密钥行的「聊天」菜单中选择 **AionUI**，允许打开应用。
2. 检查导入的地址和密钥；如果界面没有自动填全，继续按下方手动方式补齐并保存。
3. 在模型设置中获取或添加可用模型，回到会话选择该模型。

### 手动添加

1. 进入「设置 → 模型 → 添加模型」，选择 **Custom**，名称填写 `众妙之门 TaoDock`。
2. Base URL 填写 **`https://taodock.com/v1`**，API Key 填写自己的众妙之门 TaoDock 密钥。
3. 添加 `gpt-6.1-sol` 或其他可用对话模型；如显示协议选项，选择 **OpenAI 兼容**，保存。
4. 新建**内置 Agent**会话，选择刚配置的模型，先发送短消息，再验证工具调用。

<figure>
  <a href="/images/clients/aionui-platform.png" target="_blank" rel="noreferrer">
    <img src="/images/clients/aionui-platform.png" alt="AionUI 官方添加模型截图：左侧 Model 设置，右上方 Add Model，Model Platform 下拉列表第一项为 Custom" width="2352" height="1354" loading="lazy" decoding="async" />
  </a>
  <figcaption>图 3 · <a href="https://github.com/iOfficeAI/AionUi/blob/main/resources/llm_newapi.png" target="_blank" rel="noreferrer">AionUI 官方界面截图</a>，用于定位添加模型和 Custom 入口；图中尚未填写众妙之门 TaoDock 连接。点击图片放大。</figcaption>
</figure>

**对照图 3：** ① 左侧进入「Model / 模型」；② 点击「Add Model / 添加模型」；③ 在「Model Platform / 模型平台」选择列表顶部的 **Custom**，再填写下面的值。使用本节手动方式时，选择的是 Custom。

| 接下来显示的字段 | 众妙之门 TaoDock 填写值 |
| --- | --- |
| 名称（若有） | `众妙之门 TaoDock` |
| Base URL | `https://taodock.com/v1` |
| API Key | 自己的众妙之门 TaoDock API 密钥 |
| Model Name / 模型 ID | `gpt-6.1-sol`，或你的其他可用对话模型 ID |

此教程配置 AionUI 的内置 Agent。通过 AionUI 启动的其他 CLI Agent 有各自的模型与认证配置，不会仅因导入此服务商就全部完成配置。见 [AionUI 模型配置](https://github.com/iOfficeAI/AionUi/wiki/LLM-Configuration-Chinese)和[快速入门](https://github.com/iOfficeAI/AionUi/wiki/Getting-Started)。

<IntegrationConversionCallout />

## DeepChat 导入与配置 {#deepchat}

### 第一步：准备工作 {#deepchat-prepare}

从 [DeepChat 官方发布页](https://github.com/ThinkInAIXYZ/deepchat/releases)安装应用。

<IntegrationConversionCallout />

### 一键导入

1. 在众妙之门 TaoDock 密钥行的「聊天」菜单中选择 **DeepChat**。
2. 在 DeepChat 的服务商导入预览中核对 `taodock.com` 和密钥，确认导入；若提示不支持该服务商，使用下方手动配置。
3. 打开设置中的模型服务商页面，找到导入的 **New API** 服务商，获取并启用需要的模型。
4. 新建会话，选中该服务商下的模型，发送短消息。

### 手动添加

1. 打开「设置 → 服务商设置」（部分版本称「模型服务商」），点击「添加自定义服务商」，名称填写 `众妙之门 TaoDock`。
2. 接口类型选择 **OpenAI Completions（Chat Completions）**；旧版可能显示为 OpenAI 兼容。Base URL 填写 **`https://taodock.com/v1`**，密钥填写自己的众妙之门 TaoDock API 密钥。
3. 保存连接，刷新模型列表并启用 `gpt-6.1-sol` 或其他可用对话模型；列表没有该 ID 时，手动添加完整 ID。
4. 回到会话选择模型。需要工具时，在应用中另外配置并启用工具，再运行[首次 Agent 任务](#agent-check)。

<figure>
  <a href="/images/clients/deepchat-custom.jpg" target="_blank" rel="noreferrer">
    <img src="/images/clients/deepchat-custom.jpg" alt="DeepChat 服务商设置的添加自定义服务商表单：名称众妙之门 TaoDock，API 类型 OpenAI Completions，API 地址 https://taodock.com/v1，自动显示最终 chat/completions 地址，API 密钥留空" width="2600" height="1600" loading="lazy" decoding="async" />
  </a>
  <figcaption>图 4 · DeepChat 1.1.3 实际配置界面，API 密钥留空。先按图选对接口、填写地址，再粘贴自己的密钥。点击图片放大。</figcaption>
</figure>

**对照图 4：** ① 进入左侧「服务商设置」；② 点击中间的「添加自定义服务商」；③ 右侧名称填 `众妙之门 TaoDock`，API 类型选 **OpenAI Completions**；④ API 地址填 `https://taodock.com/v1`，核对下方自动显示的完整路径；⑤ 粘贴自己的 API 密钥，再点击「连接并加载模型」。也可先「保存但不测试」，之后再获取和启用模型；保存配置本身不代表连接已验证。

这套配置使用 `/v1/chat/completions`。部分版本中，单独标为「OpenAI」的类型使用 Responses 接口，选择时请确认是 **OpenAI Completions**。DeepChat 支持自定义兼容服务商，导入仍需确认预览及是否覆盖已有配置。界面和版本说明见 [DeepChat 官方项目](https://github.com/ThinkInAIXYZ/deepchat)。

<IntegrationConversionCallout />

## Open WebUI 配置 {#open-webui}
请打开独立的[Open WebUI 接入众妙之门 API 配置教程](./open-webui.md)，查看配置步骤、成功验证和错误排查。

## 其他 OpenAI 兼容应用 {#other-clients}

客户端只追加 `/chat/completions` 时，填写 `https://taodock.com/v1`；客户端追加完整的 `/v1/chat/completions` 时，填写 `https://taodock.com`。两种情况最终对话请求地址都是：

```text
https://taodock.com/v1/chat/completions
```

选择 OpenAI 兼容协议时，可以使用众妙之门 TaoDock 模型列表中支持这一协议的 Claude 模型，无需把域名改成其他服务商地址。使用 Claude 原生协议的应用则参考 [API 接口说明](../api/overview.md#endpoints)。

## 首次 Agent 任务 {#agent-check}

普通对话成功后，再验证 Agent 是否能调用工具：

1. 在电脑上新建一个用于测试的文件夹，在其中放入 `notes.txt`，写入一句「已连接众妙之门 TaoDock」。
2. 在所用应用中选择该工作目录，或按它的工具设置允许读取此文件夹。
3. 确认当前模型属于众妙之门 TaoDock 服务商，发送：「请调用文件读取工具，读取工作目录中的 notes.txt，并概括内容。」
4. 查看应用中的工具调用记录、读取结果和回复，确认它实际读取了文件。只有一句文字回答，不能证明工具已经执行。

若提示模型不支持工具、找不到文件或没有权限，分别检查模型及协议、工作目录、工具开关和应用权限。模型能回复、能使用工具、能生成图片是不同能力，需要分别验证。Agent 一项任务可能连续调用模型，可在众妙之门 TaoDock 的[普通日志](https://taodock.com/usage-logs/common)中核对请求记录。

## 如何确认已经接入成功 {#verify}

- 客户端能收到模型的正常回复。
- [众妙之门 TaoDock 普通日志](https://taodock.com/usage-logs/common)出现相同时间和模型的请求记录。
- 钱包与密钥的剩余额度足够继续使用。

模型列表能加载，只能说明模型查询成功；完整的连接验证还需要实际发送一条消息。客户端的模型检测或测试消息可能产生模型用量。

## 连接失败先检查什么 {#troubleshoot}

| 现象 | 优先检查 |
| --- | --- |
| 返回网页或 404 | 是否填了文档站地址，或出现 `/v1/v1`、重复的完整接口路径 |
| 密钥无效 / 401 | 是否使用众妙之门 TaoDock 密钥，是否完整复制，是否已停用或过期 |
| 模型不可用 | 模型 ID、协议、密钥模型限制和分组是否匹配 |
| 额度不足 | 同时检查钱包余额和密钥额度 |
| 无法打开一键导入 | 客户端是否已安装，浏览器是否允许打开应用链接 |
| WorkBuddy 找不到众妙之门 TaoDock 模型 | 是否保存自定义模型，并在会话模型选择器中明确选中它 |
| 导入后地址或密钥为空 | 客户端版本是否支持该导入格式；按对应手动教程补齐 |
| 能聊天但 Agent 不执行工具 | 当前运行模式、模型工具调用能力、工具启用状态和目录权限 |

更多错误处理见[常见问题](../faq.md)。

本页于 **2026 年 10 月 27 日**核对众妙之门 TaoDock 的客户端入口及所链接的官方资料。具体菜单以已安装版本为准，模型和工具是否可用请按上面的步骤逐项验证。
