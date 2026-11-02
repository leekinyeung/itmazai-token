---
title: "WorkBuddy 自定义模型 API 配置教程"
description: "在 WorkBuddy 桌面版添加众妙之门 TaoDock 自定义模型，正确填写 API 地址、协议与模型 ID，并验证会话中的模型选择。"
---

# WorkBuddy 自定义模型接入众妙之门教程

开始前，请准备[众妙之门 TaoDock API 密钥](https://taodock.com/keys)、足够的账户额度，并从[模型广场](https://taodock.com/pricing)复制完整模型 ID。首次使用可先完成[快速开始](../quick-start.md)。

从 [WorkBuddy 官网](https://www.workbuddy.cn/)安装桌面版并完成登录。以下是在 WorkBuddy 内使用众妙之门 TaoDock 模型的配置。

## 添加众妙之门 TaoDock 模型

1. 打开「设置 → 模型 → 自定义模型」，点击「添加模型」；也可从对话底部模型选择器进入「配置自定义模型」。
2. 供应商选择 **自定义 / Custom**，按下表填写。
3. 保存后回到对话页，展开模型选择器，在「自定义模型」分组中选中刚添加的模型；需要使用众妙之门 TaoDock 时，请明确选择它。

| 配置项 | 填写内容 |
| --- | --- |
| 供应商 | 自定义 / Custom |
| 接口地址 / URL | **`https://taodock.com/v1`** |
| API Key | 自己的众妙之门 TaoDock API 密钥 |
| 模型名称 / Model ID | `gpt-6.1-sol`，或从自己可用列表复制的完整对话模型 ID |
| 自定义协议 | 关闭，使用默认的 Chat Completions 地址补全 |

此配置最终请求 `https://taodock.com/v1/chat/completions`。若你已开启高级设置中的「自定义协议」，URL 必须改为**完整地址 `https://taodock.com/v1/chat/completions`**；不要在开启时只填写基础地址。[官方地址处理说明](https://intl.cloud.tencent.com/zh/document/product/1316/84496)介绍了这两种方式。

<figure>
  <a href="/images/clients/workbuddy-custom.jpg" target="_blank" rel="noreferrer">
    <img src="/images/clients/workbuddy-custom.jpg" alt="WorkBuddy 添加模型表单：供应商为自定义，接口地址为 https://taodock.com/v1，API Key 留空，模型名称为 gpt-6.1-sol，自定义协议未勾选，底部为保存按钮" width="1800" height="1360" loading="lazy" decoding="async" />
  </a>
  <figcaption>图 1 · WorkBuddy 5.8.3「添加模型」实际界面。截图保留空密钥栏；使用时填入自己的密钥再保存。点击图片放大。</figcaption>
</figure>

**对照图 1：** 从上往下依次选择「自定义」、填写 `https://taodock.com/v1`、粘贴自己的 API Key、填写 `gpt-6.1-sol`。按上表保持「自定义协议」未勾选，核对模型支持的能力后点击「保存」。保存完成后，仍需回到会话的模型选择器中选中它。

## 开始使用

先发送「请只回复：连接成功」，再执行[首次 Agent 任务](./clients.md#agent-check)。工具调用、图片输入等能力选项按模型和众妙之门 TaoDock 接口的实际支持情况设置，连接检测成功不代表所有能力都已验证。

需要添加多个模型时，分别使用各自的准确 Model ID 配置并保存。界面没有自定义模型入口时，先核对是否使用支持该功能的桌面版；当前移动版没有添加自定义模型的入口，见[移动版模型说明](https://www.codebuddy.cn/docs/workbuddyapp/features/Model)。桌面版操作可对照 [WorkBuddy 官方模型配置](https://www.codebuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Model)。

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
