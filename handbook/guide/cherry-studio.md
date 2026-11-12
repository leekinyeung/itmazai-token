---
title: "Cherry Studio 接入自定义大模型 API 完整教程（附 Base URL 配置与排错） - Taodock"
titleTemplate: false
description: "使用 Cherry Studio 连接Taodock，了解一键导入、New API 根地址、模型启用、智能体配置与常见错误排查。"
---

# Cherry Studio 接入 Taodock：导入与 API 配置

## 第一步：准备工作 {#prepare}

开始前，请准备[Taodock API 密钥](https://taodock.com/keys)、足够的账户额度，并从[模型广场](https://taodock.com/pricing)复制完整模型 ID。首次使用可先完成[快速开始](../quick-start.md)。

从 [Cherry Studio 官网](https://cherryai.com.cn/)下载安装桌面版。

<IntegrationConversionCallout />

## 一键导入

1. 按[控制台一键接入](./clients.md#import)操作，选择 **Cherry Studio**，允许浏览器打开应用。
2. 在 Cherry Studio 的确认界面核对地址与密钥，确认导入。
3. 打开「设置 → 模型服务」，找到导入的服务商，获取模型并启用需要的模型。
4. 回到聊天页，在模型选择器中选中该服务商下的 `gpt-6.1-sol` 或其他可用模型，发送消息验证。

## 手动添加

1. 打开「设置 → 模型服务 → New API」。没有该预设时，添加名为 `Taodock` 的 **OpenAI 兼容**服务商，用于普通文字对话。
2. API 密钥填写自己的Taodock 密钥，API 地址填写 **`https://taodock.com`**。
3. 获取或手动添加模型，完成检测后打开服务商启用开关。地址应为根地址，Cherry Studio 会补齐版本和接口路径。

<figure>
  <a href="/images/clients/cherry-provider.jpg" target="_blank" rel="noreferrer">
    <img src="/images/clients/cherry-provider.jpg" alt="Cherry Studio 模型服务设置：左侧选择模型服务和 New API，右侧 API 地址为 https://taodock.com，API 密钥已遮罩，右上角启用服务商" width="1920" height="1200" loading="lazy" decoding="async" />
  </a>
  <figcaption>图 1 · Cherry Studio 2.1.7 实际配置界面。依次找到「模型服务」「New API」「API 密钥」「API 地址」；右上角绿色开关表示服务商已启用。点击图片放大。</figcaption>
</figure>

**对照图 1：** ① 选择左侧「模型服务」和列表中的「New API」；② 填入自己的 API 密钥；③ 地址填写 `https://taodock.com`；④ 点击「同步模型」或旁边的 `+` 添加模型；⑤ 打开右上角启用开关。图中可见的模型只是该界面当前列表，普通聊天请另选你可用的对话模型。

具体地址规则见 [Cherry Studio 的 New API 配置说明](https://cherryai.com.cn/docs/zh-cn/pre-basic/providers/newapi/)。旧版 OpenAI 兼容配置若要求带版本号，可使用 `https://taodock.com/v1/`，不要再附加 `chat/completions`，详见[模型服务设置](https://cherryai.com/docs/en/pre-basic/settings/providers/)。

## 用于 Cherry 智能体

打开左侧「工作 / 智能体」，选择或创建智能体，再选择Taodock 服务商下**符合该运行模式要求**的模型，并选择工作目录。需要 Anthropic Messages 的模式，应选择支持该接口的模型和协议配置；不要仅将 OpenAI 连接中的模型名称改成 Claude。

如果提示需要 API 网关，按提示「启用并启动」，或进入「设置 → API 网关」。模型能聊天后，再按[首次 Agent 任务](./clients.md#agent-check)验证工具调用。不同运行模式的模型范围见 [Cherry 智能体模型配置](https://cherryai.com.cn/docs/zh-cn/advanced-basic/agent-workspace/create-agent/)，网关说明见 [Cherry API Gateway](https://cherryai.com/docs/en/advanced-basic/developer-tools/api-gateway/)。

## 验证一次真实请求 {#verify}

在客户端中选择Taodock 连接下的模型，发送一条简短测试消息。确认收到正常回复，并在[普通日志](https://taodock.com/usage-logs/common)找到对应时间和模型的请求。加载模型列表只验证模型发现；发送消息可能消耗额度。

需要使用智能体时，还应按[文件工具验证步骤](./clients.md#agent-check)检查实际工具调用。普通文字回复不能代替工具能力检查。

## 常见问题排查 {#troubleshoot}

| 现象 | 优先检查 |
| --- | --- |
| 返回 HTML 或 404 | API 域名、协议选择，以及是否重复追加版本号或接口路径 |
| 401 或密钥无效 | 是否复制了完整、有效的Taodock API 密钥 |
| 模型不存在或不可用 | 完整模型 ID、密钥模型限制与所属分组 |
| 提示额度不足 | 账户余额和 API 密钥额度 |
| 对话正常但工具失败 | 协议、模型能力及应用的工具权限 |

返回[客户端与 Agent 接入指南](./clients.md)，或查看[常见问题](../faq.md)继续排查。

<IntegrationConversionCallout />
