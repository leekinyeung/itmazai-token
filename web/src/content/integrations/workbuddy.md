---
kind: integration
slug: workbuddy
title: Connect WorkBuddy to Taodock's OpenAI-Compatible API
description: Set up WorkBuddy with Taodock's OpenAI-compatible endpoint, validate an actual request, and resolve key, model, quota, and protocol issues.
primaryKeyword: Taodock WorkBuddy integration
cluster: Desktop AI client integrations
subject: WorkBuddy
publishedAt: 2026-11-04
updatedAt: 2026-11-04
reviewedAt: 2026-11-04
sources:
  - label: Taodock WorkBuddy guide
    url: https://docs.taodock.com/en/guide/workbuddy.html
  - label: Taodock client guides
    url: https://docs.taodock.com/en/guide/clients.html
  - label: Taodock API integration overview
    url: https://docs.taodock.com/en/api/overview.html
related:
  - /integrations/cherry-studio
  - /integrations/openai-sdk
  - /compare/taodock-vs-openrouter
  - /models
steps:
  - title: Issue a WorkBuddy-specific API key
    description: Create a Taodock key with only the model permissions and quota that WorkBuddy requires.
  - title: Add a custom OpenAI-compatible provider
    description: Open WorkBuddy's model service settings, add a custom provider, and keep its custom protocol option disabled.
  - title: Enter the endpoint and model
    description: Set the service URL to https://taodock.com/v1, paste the dedicated key, and use an exact model ID available to that key.
  - title: Verify the request in both products
    description: Send a short prompt from WorkBuddy, then confirm the status, model, key, and usage in Taodock's request records.
docsUrl: https://docs.taodock.com/en/guide/workbuddy.html
faqItems:
  - question: What URL should WorkBuddy use for Taodock?
    answer: Use https://taodock.com/v1 as the OpenAI-compatible service URL.
  - question: Should WorkBuddy's custom protocol option be enabled?
    answer: No. Follow the Taodock guide and keep the custom protocol option disabled for this OpenAI-compatible connection.
  - question: Why does a model work in Taodock but not WorkBuddy?
    answer: Confirm that WorkBuddy uses the exact API model ID and that the selected feature is supported by that model and channel.
draft: false
---

## Integration overview

WorkBuddy can call an OpenAI-compatible service instead of connecting directly to each upstream model provider. Taodock supplies the compatible endpoint and centralizes the API key, allowed models, quota, channels, and usage records. This keeps provider credentials out of the desktop client and gives an operator one place to revoke or restrict access.

Compatibility covers the API contract that the client uses; it does not make every model interchangeable. WorkBuddy features that depend on tools, vision, long context, structured output, or a particular streaming convention must be verified with the selected model. The safest rollout begins with a basic chat and then tests each advanced capability separately.

## Before you start

Confirm that your Taodock account can create keys and has usable quota. Create a new key specifically for WorkBuddy. Restrict its model access to the small set you intend to use and apply a quota appropriate for the device or user. A separate credential makes rotation and investigation much easier than sharing a broad key across applications.

Obtain an exact model ID from Taodock's model list or `/v1/models` using that key. Model display names in a user interface may differ from the API value. If the key cannot see the model before WorkBuddy is configured, the client will not fix that authorization problem.

Use a current WorkBuddy version and make sure the device can reach `https://taodock.com` over TLS. Corporate proxies or VPNs sometimes interfere with streaming; knowing whether the same endpoint works with a direct request helps isolate those network conditions.

## WorkBuddy settings

Open WorkBuddy's settings and locate its model service or custom provider configuration. Add an OpenAI-compatible service and enter:

- **Service URL:** `https://taodock.com/v1`
- **API key:** the dedicated Taodock key
- **Model:** an exact model ID returned by Taodock
- **Custom protocol:** disabled

The `/v1` segment is required in WorkBuddy's service URL. Do not add `/chat/completions`; the client appends the operation path. Do not put a trailing operation path copied from a command-line example into the base field.

Save the connection and select the new provider and model for a fresh conversation. Avoid changing timeout, proxy, sampling, and advanced model settings simultaneously. A minimal configuration makes any error easier to attribute.

## Validate an actual completion

Send a short instruction with a predictable result, for example: `Return the words WorkBuddy connected and nothing else.` Confirm that the assistant responds and that the selected provider remains Taodock.

Then open Taodock's request records. Find the matching timestamp and verify the key, model, successful status, and token usage. This second check catches cases where a client silently falls back to a different provider. It also confirms that quota accounting is associated with the intended credential.

Run a second test using the mode your team expects in production. If streaming is enabled, confirm that partial text arrives and the stream closes normally. If WorkBuddy uses tools or workspace context, test with sanitized content and check the gateway error details if it fails. Never include a live key in a screenshot or support transcript.

## Common problems

### 401 unauthorized

Recopy the key and remove spaces or quotes. Make sure WorkBuddy is sending it to Taodock rather than to a provider configuration left over from an earlier test. Check whether the Taodock key has been disabled or expired. Rotate the credential immediately if it has appeared in logs, screen recordings, or public issue reports.

### 404 endpoint or model errors

The service URL must be `https://taodock.com/v1`, not the site root and not the full chat-completions endpoint. For a model error, list models with the same key and copy the precise ID. The model also needs a usable Taodock channel; a catalog entry alone does not guarantee that every account or group can call it.

### Insufficient quota

Review account balance, key quota, group access, and model availability. A restricted WorkBuddy key can correctly reject a request even when a broader administrator key succeeds. Increase the narrow limit only after confirming that the request is expected. Repeated retries against a quota failure create noise without resolving the cause.

### Streaming or connection resets

Test a non-streaming request. If it succeeds, update WorkBuddy, try a second model, and temporarily bypass any VPN or HTTP inspection layer. Event streams can be buffered by intermediaries. If all request types fail, verify DNS and TLS access to Taodock before changing the API protocol setting.

### Feature-specific failures

A plain chat response does not prove tool calling, image input, file processing, or structured output. Confirm the selected model's capabilities and the fields WorkBuddy sends. Try the smallest feature-specific request and compare its sanitized error with a direct API request using the same model.

## Safe ongoing use

Give each team, device, or automation a distinct key. That design lets you revoke one WorkBuddy installation without breaking unrelated applications. Keep key quotas conservative until the usage pattern is understood and review the Taodock records for unexpected models or repeated failures.

When upgrading WorkBuddy, run the small verification prompt again before a broad rollout. Client updates can change provider labels or request behavior. Keep the official Taodock WorkBuddy guide bookmarked for current screen-specific instructions, while this page provides the validation and operational checklist around those settings.
