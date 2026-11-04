---
kind: integration
slug: deepchat
title: Connect DeepChat to TaoDock's OpenAI-Compatible API
description: Set up DeepChat with TaoDock using OpenAI Completions, validate a live request, and troubleshoot base URL, key, model, quota, and feature issues.
primaryKeyword: TaoDock DeepChat integration
cluster: Desktop AI client integrations
subject: DeepChat
publishedAt: 2026-11-04
updatedAt: 2026-11-04
reviewedAt: 2026-11-04
sources:
  - label: TaoDock DeepChat client guide
    url: https://docs.taodock.com/en/guide/clients.html#deepchat
  - label: TaoDock API integration overview
    url: https://docs.taodock.com/en/api/overview.html
related:
  - /integrations/aionui
  - /integrations/cherry-studio
  - /integrations/openai-sdk
  - /models
steps:
  - title: Create a key for DeepChat
    description: Generate a TaoDock key restricted to the models and quota this DeepChat installation needs.
  - title: Select OpenAI Completions
    description: In DeepChat provider settings, choose the OpenAI Completions connection type.
  - title: Set the base and model values
    description: Enter https://taodock.com/v1 as the base URL, paste the dedicated key, and select an exact TaoDock model ID.
  - title: Run a verified chat
    description: Send a deterministic prompt and confirm the matching request, model, key, status, and usage in TaoDock.
docsUrl: https://docs.taodock.com/en/guide/clients.html#deepchat
faqItems:
  - question: Which DeepChat provider type works with TaoDock?
    answer: Select OpenAI Completions and configure it with the TaoDock OpenAI-compatible base URL and key.
  - question: What base URL should I enter?
    answer: Use https://taodock.com/v1. DeepChat appends the operation path for requests.
  - question: Why do text requests work while an advanced feature fails?
    answer: The exact model or channel may not support the advanced fields DeepChat sends. Validate tools, images, files, and other features separately.
draft: false
---

## What the DeepChat connection provides

DeepChat can send OpenAI Completions-style requests to an OpenAI-compatible service. TaoDock acts as that service and applies the key's model permissions, quota, and configured upstream channel. It also provides request and usage records that help the operator confirm which model handled a conversation.

This arrangement avoids entering a collection of upstream provider credentials into DeepChat. It does not erase model differences. Streaming, tools, images, files, context size, and provider-specific options must be supported by the exact model and TaoDock channel. Build confidence with a basic completion, then test each feature your workflow depends on.

## Prepare TaoDock

Sign in to an account with permission to create keys and confirm that it has usable quota. Create a key dedicated to DeepChat. Restrict its models and set a limit suitable for the user or device. Do not share an unlimited administrative key across desktop applications.

List the models visible to the dedicated key. Copy an exact ID for the initial connection. This step proves that authorization and model access are working before the client is involved. It also avoids confusing a model's friendly display name with its API identifier.

Install or update DeepChat and make sure the device can reach `https://taodock.com` securely. If it operates behind a company proxy, note that streaming traffic may be handled differently from ordinary HTTPS requests.

## Configure DeepChat

Open DeepChat's provider or model settings. Select **OpenAI Completions** and enter:

- **Base URL:** `https://taodock.com/v1`
- **API key:** the restricted TaoDock key
- **Model:** an exact model ID available to that key

The Base URL should not include `/chat/completions`; DeepChat constructs the request path. Save the provider and select it in a new conversation. Keep custom request parameters at their defaults until a standard request has succeeded.

When multiple OpenAI-compatible connections exist, name this configuration clearly. Confirm the active provider and model before every diagnostic prompt so an older connection cannot produce a misleading success.

## Test and verify the request

Send: `Reply with exactly: DeepChat connected to TaoDock.` Confirm that the response matches. Then open TaoDock's request records and find the event at the same timestamp. Verify the dedicated key, model, successful status, and token usage.

A client-visible answer plus a server-side usage record establishes the complete path. Next, test the normal streaming mode with a longer prompt. If DeepChat will use tools, images, files, or long context, run a small sanitized test for each. Record request identifiers and errors, but never copy the API key into support material.

## Troubleshooting

### DeepChat reports an invalid key

Remove quotes, spaces, and line breaks from the copied value. Confirm that the key remains active and belongs to TaoDock. Check that the DeepChat provider is not sending it to a different saved Base URL. Rotate the key immediately if it has been disclosed.

### The request path returns 404

Use `https://taodock.com/v1` as the Base URL. A root URL may not point to the API, while a full operation URL can be duplicated by the client. If `/v1/models` works with the same key, the credential and API version are reachable and the remaining problem is likely the model or operation.

### The model is unavailable

Copy the exact ID returned for the dedicated key. Ensure the key's group has permission and TaoDock has a usable channel. If another model succeeds, preserve the working base URL and key while investigating that one model. Avoid changing several settings at once.

### Quota is exhausted

Inspect both account-level resources and the key's own quota. A dedicated key is supposed to enforce its narrower limit. Confirm that usage is legitimate before increasing it, and investigate repeated automatic retries if consumption is unexpected.

### Streaming is blank or interrupted

Disable streaming for one request. If the full response succeeds, update DeepChat, test another model, and compare on a network without VPN or HTTP inspection. Intermediaries can buffer server-sent events or close idle connections. If non-streaming also fails, focus first on the status and sanitized gateway error.

### Tools, files, or images are rejected

Verify capability support for the exact model and channel. OpenAI-compatible text completion does not guarantee every multimodal or tool schema. Reduce the request to the smallest failing feature and compare it with a direct API request using the same model and fields.

## Maintenance and security

Use separate keys for separate DeepChat users or installations when practical. A compromised or retired device can then be revoked without affecting other clients. Keep quotas conservative, review unexpected models, and rotate credentials during ownership changes.

Document the Base URL, intended model IDs, key owner, quota policy, and validation prompt without recording the secret. After major client upgrades, rerun the basic prompt, streaming test, and one representative advanced feature. Use the official TaoDock DeepChat guide as the current reference for screen-specific configuration.
