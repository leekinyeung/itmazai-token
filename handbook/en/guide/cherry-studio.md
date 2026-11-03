---
title: "Cherry Studio Custom LLM API Setup Guide (Base URL Configuration and Troubleshooting) - TaoDock"
titleTemplate: false
description: "Connect Cherry Studio to TaoDock using key import or New API settings, enable models, check Agent compatibility and troubleshoot requests."
---

# Cherry Studio API Setup and Import Guide

## Step 1: Preparation {#prepare}

Before you start, prepare your [TaoDock API key](https://taodock.com/keys), sufficient account quota and an exact model ID from the [model catalog](https://taodock.com/pricing). See the [quick start](../quick-start.md) if this is your first integration.

Install the desktop application from the [Cherry Studio website](https://cherryai.com/).

<IntegrationConversionCallout />

## Import from TaoDock

1. Follow [console import](./clients.md#import), choose **Cherry Studio**, and allow the browser to open it.
2. Check the address and key in Cherry Studio's confirmation screen, then confirm.
3. Open **Settings → Model Provider**, find the imported provider, fetch models, and enable the ones you need.
4. In chat, select `gpt-6.1-sol` or another accessible model under that provider and send a message.

## Add a provider manually

1. Open **Settings → Model Provider → New API**. If this preset is unavailable, add an **OpenAI-compatible** provider named `TaoDock` for ordinary text chat.
2. Enter your TaoDock API key and set API Host to **`https://taodock.com`**.
3. Fetch or manually add models, run a connection check, and enable the provider. Cherry Studio adds the version and endpoint paths to this root address.

<figure>
  <a href="/images/clients/cherry-provider.jpg" target="_blank" rel="noreferrer">
    <img src="/images/clients/cherry-provider.jpg" alt="Cherry Studio model provider settings: select Model Provider and New API on the left; the API host is https://taodock.com, the key is masked, and the provider switch is enabled at the top right" width="1920" height="1200" loading="lazy" decoding="async" />
  </a>
  <figcaption>Figure 1 · Actual Cherry Studio 2.1.7 interface in Chinese. Locate Model Provider (模型服务), New API, API Key (API 密钥), and API Host (API 地址). The green switch enables the provider. Click to enlarge.</figcaption>
</figure>

**Follow Figure 1:** ① Select Model Provider and New API; ② enter your own API key; ③ enter `https://taodock.com`; ④ use Sync Models (同步模型) or `+` to add models; ⑤ enable the provider with the top-right switch. The pictured list belongs to that configuration; select an accessible text model for ordinary chat.

See [Cherry Studio's New API guide](https://cherryai.com.cn/docs/zh-cn/pre-basic/providers/newapi/). An older OpenAI-compatible configuration requiring a versioned base address can use `https://taodock.com/v1/` without appending `chat/completions`; see the [connection settings](https://cherryai.com/docs/en/pre-basic/settings/providers/).

## Use Cherry Agents

Open **Work / Agents** in the left navigation, choose or create an Agent, select a TaoDock model **compatible with its runtime mode**, and choose a working directory. A mode requiring Anthropic Messages needs a model and protocol supporting that endpoint; changing an OpenAI connection's model name to Claude is insufficient.

If prompted to start the API Gateway, select **Enable and Start** or open **Settings → API Gateway**. After chat works, follow the [first Agent task](./clients.md#agent-check). See the official [Agent model configuration](https://cherryai.com.cn/docs/zh-cn/advanced-basic/agent-workspace/create-agent/) and [API Gateway guide](https://cherryai.com/docs/en/advanced-basic/developer-tools/api-gateway/).

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
