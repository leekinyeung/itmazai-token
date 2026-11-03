---
title: "WorkBuddy Custom LLM API Setup Guide (Base URL Configuration and Troubleshooting) - TaoDock"
titleTemplate: false
description: "Add a TaoDock custom model to WorkBuddy desktop, configure the API URL and protocol, select the model and verify a chat request."
---

# WorkBuddy Custom Model Setup Guide

## Step 1: Preparation {#prepare}

Before you start, prepare your [TaoDock API key](https://taodock.com/keys), sufficient account quota and an exact model ID from the [model catalog](https://taodock.com/pricing). See the [quick start](../quick-start.md) if this is your first integration.

Install the desktop application from the [WorkBuddy website](https://www.workbuddy.cn/) and sign in. Configure a TaoDock model inside WorkBuddy as follows.

<IntegrationConversionCallout />

## Add the TaoDock model

1. Open **Settings → Model → Custom Models → Add Model**. You can also open custom model configuration from the conversation's model selector.
2. Choose **Custom** as the provider and enter the values below.
3. Save, return to the conversation, and explicitly select the new entry in the **Custom Models** group when you want to use TaoDock.

| Setting | Value |
| --- | --- |
| Provider | Custom |
| URL | **`https://taodock.com/v1`** |
| API Key | Your TaoDock API key |
| Model name / Model ID | `gpt-6.1-sol`, or an exact chat model ID available to your key |
| Custom protocol | Off, using default Chat Completions path completion |

This produces `https://taodock.com/v1/chat/completions`. If **Custom protocol** is on in advanced settings, enter the **complete URL `https://taodock.com/v1/chat/completions`** instead of the base address. See the [official URL handling rules](https://intl.cloud.tencent.com/zh/document/product/1316/84496).

<figure>
  <a href="/images/clients/workbuddy-custom.jpg" target="_blank" rel="noreferrer">
    <img src="/images/clients/workbuddy-custom.jpg" alt="WorkBuddy Add Model form: Custom provider, URL https://taodock.com/v1, blank API Key, model gpt-6.1-sol, Custom protocol unchecked, and Save at the bottom" width="1800" height="1360" loading="lazy" decoding="async" />
  </a>
  <figcaption>Figure 1 · Actual WorkBuddy 5.8.3 Add Model interface in Chinese. The key field is blank for the screenshot; enter your own key before saving. Click to enlarge.</figcaption>
</figure>

**Follow Figure 1:** From top to bottom, select Custom (自定义), enter `https://taodock.com/v1`, paste your API key, and enter `gpt-6.1-sol`. Keep Custom protocol (自定义协议) unchecked, confirm supported capabilities, and click Save (保存). Then select the saved model in the conversation's model selector.

## Start using it

Send “Reply only: connection successful,” then try the [first Agent task](./clients.md#agent-check). Configure tool calling and image input according to the model's actual capabilities; a connection check does not validate every capability.

Add and save each additional model using its exact ID. If custom model configuration is absent, check that you are using a desktop version supporting it. The current mobile application cannot add custom models; see its [model guide](https://www.codebuddy.cn/docs/workbuddyapp/features/Model). See [WorkBuddy's desktop model configuration](https://www.codebuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Model) for the interface.

## Verify a real request {#verify}

Select a model under the TaoDock connection and send a short test message. Confirm that a normal response arrives and that a matching request appears in [TaoDock request logs](https://taodock.com/usage-logs/common). Loading a model list verifies model discovery; sending a message may consume quota.

For Agent workflows, also follow the [file tool verification](./clients.md#agent-check). A normal text reply alone does not establish tool support.

## Troubleshooting {#troubleshoot}

| Symptom | What to check |
| --- | --- |
| HTML response or 404 | Use the API domain, check protocol selection and avoid duplicated version or endpoint paths |
| 401 or invalid key | Copy your complete, active TaoDock API key |
| Missing or unavailable model | Copy the exact model ID and check key restrictions and the selected group |
| Insufficient quota | Check both the account balance and API key quota |
| Chat works but tools fail | Verify the protocol, model capability and the application's tool permissions |

Return to [all client integration guides](./clients.md) or see the [FAQ](../faq.md) for more help.

<IntegrationConversionCallout />
