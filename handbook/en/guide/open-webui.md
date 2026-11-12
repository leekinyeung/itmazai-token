---
title: "Open WebUI Custom LLM API Setup Guide (Base URL Configuration and Troubleshooting) - Taodock"
titleTemplate: false
description: "Configure a Taodock OpenAI-compatible connection in Open WebUI, set the API URL and key, load models and troubleshoot connectivity."
---

# Open WebUI OpenAI-Compatible API Setup

## Step 1: Preparation {#prepare}

Before you start, prepare your [Taodock API key](https://taodock.com/keys), sufficient account quota and an exact model ID from the [model catalog](https://taodock.com/pricing). See the [quick start](../quick-start.md) if this is your first integration.

You need permission to manage connections in Open WebUI.

<IntegrationConversionCallout />

1. Open **Settings → Admin → Connections**.
2. Add an OpenAI connection with URL **`https://taodock.com/v1`**.
3. Enter your Taodock API key and save.
4. Verify the connection and fetch the model list, then select an available chat model.
5. Return to chat and send a short test message.

If models do not appear automatically, add their full Taodock IDs to the connection's Model IDs. See the [Open WebUI connection guide](https://docs.openwebui.com/getting-started/quick-start/connect-a-provider/starting-with-openai-compatible/) for the current interface.

## Verify a real request {#verify}

Select a model under the Taodock connection and send a short test message. Confirm that a normal response arrives and that a matching request appears in [Taodock request logs](https://taodock.com/usage-logs/common). Loading a model list verifies model discovery; sending a message may consume quota.

For Agent workflows, also follow the [file tool verification](./clients.md#agent-check). A normal text reply alone does not establish tool support.

## Troubleshooting {#troubleshoot}

| Symptom | What to check |
| --- | --- |
| HTML response or 404 | Use the API domain, check protocol selection and avoid duplicated version or endpoint paths |
| 401 or invalid key | Copy your complete, active Taodock API key |
| Missing or unavailable model | Copy the exact model ID and check key restrictions and the selected group |
| Insufficient quota | Check both the account balance and API key quota |
| Chat works but tools fail | Verify the protocol, model capability and the application's tool permissions |

Return to [all client integration guides](./clients.md) or see the [FAQ](../faq.md) for more help.

<IntegrationConversionCallout />
