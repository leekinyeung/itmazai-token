---
kind: integration
slug: aionui
title: Connect AionUI to Taodock's OpenAI-Compatible API
description: Configure AionUI with Taodock's API base URL and a restricted key, verify an actual model request, and diagnose connection and quota errors.
primaryKeyword: Taodock AionUI integration
cluster: Desktop AI client integrations
subject: AionUI
publishedAt: 2026-11-04
updatedAt: 2026-11-04
reviewedAt: 2026-11-04
sources:
  - label: Taodock AionUI client guide
    url: https://docs.taodock.com/en/guide/clients.html#aionui
  - label: Taodock API integration overview
    url: https://docs.taodock.com/en/api/overview.html
related:
  - /integrations/deepchat
  - /integrations/cherry-studio
  - /integrations/openai-sdk
  - /models
steps:
  - title: Create a dedicated Taodock key
    description: Issue a key for AionUI, restrict its model access, and set a quota that matches the device or user.
  - title: Add an OpenAI-compatible provider
    description: Open AionUI's provider settings and add a custom OpenAI-compatible connection.
  - title: Enter the Taodock values
    description: Use https://taodock.com/v1 as the Base URL, paste the dedicated key, and choose an exact model ID exposed to it.
  - title: Test and confirm usage
    description: Send a short chat from AionUI and confirm the matching model, key, status, and usage in Taodock.
docsUrl: https://docs.taodock.com/en/guide/clients.html#aionui
faqItems:
  - question: What Base URL should AionUI use?
    answer: Use https://taodock.com/v1 for an OpenAI-compatible Taodock connection.
  - question: How should I choose the model name in AionUI?
    answer: Fetch or copy an exact model ID available to the same Taodock key. Do not rely on a display name or assume IDs are portable between gateways.
  - question: Does a successful text chat verify every AionUI feature?
    answer: No. Test tools, images, files, streaming, and other advanced behavior separately with the exact model you intend to use.
draft: false
---

## Integration overview

AionUI can use an OpenAI-compatible provider for chat and supported model capabilities. Taodock supplies that API surface while centralizing the credential, model permissions, upstream channels, quota, and request records. The integration reduces the number of provider secrets stored in the desktop client and gives the Taodock operator a single place to revoke access.

An OpenAI-compatible connection is a protocol starting point, not a promise that all models expose the same features. Context limits, multimodal input, tools, reasoning controls, and streaming details depend on the model and channel. Establish a working text request first and then validate each production feature independently.

## Prerequisites

You need a Taodock account with usable quota, permission to create API keys, and at least one available model. Install a current AionUI release and confirm that the device can reach Taodock over HTTPS.

Create an API key only for this AionUI installation. Limit it to the models the user needs and apply a quota. If several people or machines use AionUI, create a distinct key for each operational boundary. Separate keys simplify revocation, rotation, investigation, and cost attribution.

Use the key to list models in Taodock before configuring the client. Copy an exact API ID. This preliminary test proves the key can authenticate and prevents a guessed model name from obscuring an otherwise correct connection.

## Configure AionUI

Open AionUI's settings and find its model provider configuration. Add a custom or OpenAI-compatible provider and set:

- **Base URL:** `https://taodock.com/v1`
- **API key:** the dedicated Taodock key
- **Model:** an exact model ID available to that key

The base URL ends at `/v1`. Do not append an operation such as `/chat/completions`; AionUI constructs that portion. Save the provider, select it for a new conversation, and keep advanced overrides at their defaults for the first test.

If AionUI allows a custom provider name, use a clear label such as `Taodock`. When multiple providers expose models with similar names, the label helps prevent a test from silently using an old connection.

## Verify a real request

Start a new chat and send a short deterministic prompt: `Reply with exactly: AionUI connection verified.` Confirm the response and then inspect Taodock's newest request record. The record should identify the dedicated key, exact model, successful status, and plausible token usage at the matching time.

This server-side check matters because a client can retain an earlier provider or fall back to another model. Verify streaming next if it is enabled for normal use. Then test images, tools, long context, or structured output one at a time. Use sanitized input and retain non-secret request identifiers when troubleshooting.

## Troubleshooting

### Unauthorized or invalid API key

Recopy the key without quotes or spaces. Confirm that it is active and that AionUI is sending it to the Taodock provider. If the credential appeared in a screenshot, terminal history, shared configuration, or issue report, revoke it and create a replacement rather than continuing to use it.

### Endpoint not found

Check that the Base URL is exactly `https://taodock.com/v1`. A site root can lead the client to the wrong path; a full operation URL can cause the operation to be appended twice. Test the same key against `/v1/models` to distinguish an endpoint issue from a model issue.

### Model not found

Refresh or recopy the model list using the same key. Model IDs are exact and may differ from display labels. Taodock also needs a usable channel for the selected model and the key's group must have access. If another known model succeeds, investigate the failing model path rather than changing authentication.

### Insufficient quota

Review the account balance and the limit on the AionUI key. A narrow key quota can reject a request even when the account is funded. Confirm the request was expected before increasing the limit. Do not substitute a broadly privileged key only to bypass a deliberate restriction.

### Streaming stops early

Try the same prompt without streaming. If it completes, update AionUI and test another model. VPNs, reverse proxies, antivirus inspection, and corporate networks can buffer or terminate event streams. Compare with a direct network before modifying Taodock channel routing.

### Advanced features fail

Basic text compatibility does not validate every request field. Confirm that the model and channel support AionUI's particular tool, image, file, audio, or reasoning request. Reduce the case to one feature and inspect a sanitized gateway error. Unsupported client fields should be diagnosed separately from credentials and quota.

## Operating the connection safely

Keep the AionUI key isolated, rotate it when device ownership changes, and revoke it when the client is no longer used. Begin with conservative quota and expand it based on observed requests. Review the Taodock model and usage record periodically for unexpected selections or repeated errors.

For a team, document the connection owner, intended models, quota policy, and recovery procedure without storing the secret in the document. After an AionUI upgrade, rerun the deterministic prompt and one representative advanced request. Consult the official Taodock client guide for the current screen labels and fields.
