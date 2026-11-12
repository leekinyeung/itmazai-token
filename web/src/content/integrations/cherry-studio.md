---
kind: integration
slug: cherry-studio
title: Connect Cherry Studio to Taodock's OpenAI-Compatible API
description: Configure Cherry Studio with Taodock, verify a real chat request, and troubleshoot API host, key, model, quota, and streaming problems.
primaryKeyword: Taodock Cherry Studio integration
cluster: Desktop AI client integrations
subject: Cherry Studio
publishedAt: 2026-11-04
updatedAt: 2026-11-04
reviewedAt: 2026-11-04
sources:
  - label: Taodock Cherry Studio guide
    url: https://docs.taodock.com/en/guide/cherry-studio.html
  - label: Taodock client guides
    url: https://docs.taodock.com/en/guide/clients.html
  - label: Taodock API integration overview
    url: https://docs.taodock.com/en/api/overview.html
related:
  - /integrations/open-webui
  - /integrations/deepchat
  - /integrations/openai-sdk
  - /models
steps:
  - title: Create a restricted Taodock API key
    description: Sign in to Taodock, create a key for Cherry Studio, and limit its model access and quota to what this client needs.
  - title: Add the New API provider
    description: In Cherry Studio provider settings, choose the New API preset and enter https://taodock.com as the API Host.
  - title: Enter the key and synchronize models
    description: Paste the dedicated Taodock key, fetch the available models, and enable only the exact model IDs returned for that key.
  - title: Send and verify a real request
    description: Start a new chat, send a short prompt, and confirm the request and usage record in Taodock before relying on the connection.
docsUrl: https://docs.taodock.com/en/guide/cherry-studio.html
faqItems:
  - question: Should the Cherry Studio API Host include /v1?
    answer: No. When using Cherry Studio's New API preset, enter https://taodock.com as the API Host. The preset constructs the API path.
  - question: Why does Cherry Studio show no models?
    answer: Confirm that the key is active and allowed to access models, then refresh the provider's model list. Copy an exact model ID from Taodock rather than guessing one.
  - question: Can I reuse my main Taodock key in Cherry Studio?
    answer: It can work, but a dedicated restricted key is safer and makes quota, revocation, and usage review easier for this client.
draft: false
---

## What this integration does

Cherry Studio can connect to services that expose an OpenAI-compatible interface. Taodock provides that interface while placing the API key, model access, provider channels, quota, and usage records under one gateway account. The practical result is that Cherry Studio can use models made available by Taodock without storing every upstream provider credential in the desktop client.

The compatibility layer does not mean that every model behaves identically. Model IDs, context limits, tool support, vision support, streaming behavior, and provider errors still depend on the selected model and the channel behind it. Treat the first connection as a real integration test, not only as a successful settings save.

## Prerequisites

You need a Taodock account, an active balance or quota, and permission to create an API key. The key must be allowed to use at least one model. You also need a current Cherry Studio installation with access to provider settings.

Create a separate key for this client. Give it only the models Cherry Studio needs and set a sensible quota. If the desktop is shared, managed by another person, or used for demonstrations, assume that anything pasted into its settings can be read by someone with access to that profile. Never paste an upstream provider secret when a restricted Taodock key is sufficient.

Before configuration, open Taodock's model list or call `/v1/models` with the new key. Record an exact model ID. A familiar marketing name is not necessarily the value that the API accepts.

## Exact Cherry Studio configuration

Open Cherry Studio settings and go to the model provider area. Add or enable the **New API** provider preset. Use these values:

- **API Host:** `https://taodock.com`
- **API Key:** the dedicated Taodock key you created
- **Model:** an exact model ID returned for that key

For this preset, do not append `/v1` to the API Host. Cherry Studio builds the endpoint from the host. Adding the version segment again can produce a path such as `/v1/v1/...` and a 404 response.

Use the provider's model synchronization or model management control to fetch available models. Enable one known model first. A short list makes initial diagnosis easier than importing every possible model at once. Save the provider, then select it in a new conversation.

## Verify the connection with a real request

Send a deterministic prompt such as: `Reply with exactly: Taodock connection verified.` A visible assistant response proves that Cherry Studio reached a model, but complete verification also includes the gateway record.

In Taodock, inspect the newest request or usage log. Check that it belongs to the dedicated key, uses the intended model, records a successful status, and shows plausible token usage. Do not use or share prompt content as a support artifact if it contains private information. A request identifier, timestamp, model, status, and sanitized error are normally more useful.

Next, enable streaming if that is how the client will normally operate. Send a longer prompt and make sure text arrives progressively and completes cleanly. If you plan to use images, tools, or reasoning controls, test those capabilities individually with the exact model; an ordinary text response does not verify them.

## Troubleshooting

### Authentication errors

A 401 response usually means the key is missing, copied incorrectly, disabled, expired, or sent to the wrong host. Recopy the Taodock key without surrounding spaces. Confirm that the host is HTTPS and contains no extra path. If the key may have been exposed, revoke it and create another instead of repeatedly pasting it into screenshots or chat messages.

### Model not found or unavailable

A 404 or model-related error often indicates an incorrect model ID or a key that is not authorized for that model. Refresh the list in Cherry Studio and compare the selected value character for character with Taodock. A model may also be temporarily unavailable because no usable channel is configured for it. Try another model already known to work before changing unrelated settings.

### Quota or billing failures

If the request is rejected for insufficient quota, inspect both the account balance and the dedicated key's limit. A key-level limit can block requests even when the account still has funds. Verify the group and model permissions assigned to the key. Do not respond by creating an unlimited key unless that broader access is intentional.

### Streaming stops or returns an empty answer

First retry with streaming disabled. If a non-streaming request succeeds, update Cherry Studio and test a different model to isolate a client, model, or provider-specific stream issue. Proxies, VPNs, and corporate inspection products can buffer or terminate event streams; test once on a direct network before changing gateway routing.

### Tools or attachments do not work

OpenAI-compatible text chat is only the baseline. Confirm that the chosen model and its Taodock channel support the exact tool, image, audio, or document behavior that Cherry Studio is sending. Review the sanitized gateway error and the model's documented capability instead of assuming that all models accept the same request fields.

## Operational recommendations

Keep the key dedicated to Cherry Studio, rotate it if the device changes owners, and revoke it when the client is retired. Start with a low quota and expand it after observing real usage. For a team deployment, document the provider name, base host, allowed models, key owner, and renewal procedure without writing the secret itself.

Review logs for unexpected model selection or repeated failures. If several desktop clients use the same gateway, give each client or person a distinct key so a problem can be contained without interrupting everyone. This also makes usage attribution more reliable than sharing one credential across machines.

The official Taodock Cherry Studio guide remains the source of truth for the current client screens. Recheck it after a major Cherry Studio update because labels and provider presets can move even when the underlying API values remain the same.
