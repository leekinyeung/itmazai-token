---
kind: integration
slug: openai-sdk
title: Use the OpenAI SDK with Taodock's Compatible API
description: Point the OpenAI SDK at Taodock, keep credentials in environment variables, verify models and chat responses, and handle common API errors safely.
primaryKeyword: Taodock OpenAI SDK integration
cluster: Developer API integrations
subject: OpenAI SDK
publishedAt: 2026-11-04
updatedAt: 2026-11-04
reviewedAt: 2026-11-04
sources:
  - label: Taodock API integration overview
    url: https://docs.taodock.com/en/api/overview.html
  - label: Taodock client guides
    url: https://docs.taodock.com/en/guide/clients.html
related:
  - /integrations/open-webui
  - /integrations/cherry-studio
  - /compare/taodock-vs-litellm
  - /models
steps:
  - title: Create a least-privilege API key
    description: Generate a Taodock key for this application, restrict its models and quota, and store it in TAODOCK_API_KEY.
  - title: Configure the SDK client
    description: Initialize the OpenAI SDK with base_url or baseURL set to https://taodock.com/v1 and the environment-supplied key.
  - title: List and select a model
    description: Query the models endpoint with the same client and use an exact model ID returned for the key.
  - title: Send and reconcile a test request
    description: Make a small completion request, preserve its non-secret request context, and verify status, model, tokens, and usage in Taodock.
docsUrl: https://docs.taodock.com/en/api/overview.html
faqItems:
  - question: Does the OpenAI SDK need a different package for Taodock?
    answer: No. Configure the supported OpenAI SDK with Taodock's base URL and a Taodock API key.
  - question: What base URL should SDK code use?
    answer: Use https://taodock.com/v1 and let the SDK append resource paths.
  - question: Is every OpenAI SDK method supported for every Taodock model?
    answer: No. Compatibility and capabilities depend on the endpoint, selected model, channel, and fields. Test the exact methods your application uses.
draft: false
---

## When to use the SDK integration

An application already built around an OpenAI SDK can often connect to Taodock by changing the base URL, API key, and model ID. Taodock then authenticates the application key, applies its permissions and quota, routes the request through configured channels, and records usage. This is useful when an application needs access to multiple providers without embedding every upstream credential.

OpenAI compatibility reduces client changes, but it is not a guarantee that every method, request field, model feature, or error behaves identically. Validate the precise endpoints your application uses. Streaming, tools, images, audio, files, structured output, embeddings, and response APIs should each be tested with their selected model.

## Prepare credentials and models

Create a Taodock API key specifically for the application and environment. Development, staging, and production should not share one credential. Restrict model access and set quota or expiration according to the workload. Store the secret in a managed environment variable or secret store—not in source code, browser bundles, logs, screenshots, or committed `.env` files.

For local examples, use the variable name `TAODOCK_API_KEY`. The name makes it clear that this is a gateway credential rather than a direct upstream provider key. Load it through your runtime's normal environment mechanism.

Before sending a completion, use the same SDK client or a direct request to list models. Select an exact model ID returned to the key. This avoids assuming that identifiers from another gateway are portable.

## Python configuration

Initialize the supported Python SDK with Taodock's API base and the environment variable:

```python
import os
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["TAODOCK_API_KEY"],
    base_url="https://taodock.com/v1",
)

models = client.models.list()
print([model.id for model in models.data])

response = client.chat.completions.create(
    model="YOUR_MODEL_ID",
    messages=[{"role": "user", "content": "Reply with exactly: SDK connected"}],
)
print(response.choices[0].message.content)
```

Replace `YOUR_MODEL_ID` with a value returned for the key. Do not copy a model name from a pricing article or another platform without checking the live list.

## JavaScript and TypeScript configuration

Server-side JavaScript can configure the official SDK in the same way:

```typescript
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.TAODOCK_API_KEY,
  baseURL: 'https://taodock.com/v1',
})

const models = await client.models.list()
console.log(models.data.map((model) => model.id))

const response = await client.chat.completions.create({
  model: 'YOUR_MODEL_ID',
  messages: [{ role: 'user', content: 'Reply with exactly: SDK connected' }],
})
console.log(response.choices[0]?.message.content)
```

Run this only in a trusted server or local process. Shipping a Taodock key in public browser JavaScript exposes it to every visitor. A browser application should call your authenticated backend, which holds and controls the gateway credential.

## Verify more than the response text

After the test returns, find the matching request in Taodock. Confirm the dedicated key, exact model, status, token usage, and charge or quota change. Preserve a non-secret request identifier if available so client and gateway records can be correlated.

Test failure behavior deliberately. Use a disabled test key, a nonexistent model, and an intentionally small quota in a non-production environment. Confirm that the application distinguishes authentication failures, permission or model errors, rate limits, quota exhaustion, provider failures, and timeouts. Retry only errors that are safe for the operation; uncontrolled retries can multiply cost or duplicate side effects.

For streaming, consume and close the stream according to the SDK's documented lifecycle. Test client cancellation and make sure your server stops unnecessary downstream work. For tools or structured output, validate the exact schema and model instead of inferring support from an ordinary chat completion.

## Common errors

### 401 authentication failed

Confirm `TAODOCK_API_KEY` is present in the actual process environment and not only in an unopened shell or ignored file. Check for whitespace and verify that the client uses the Taodock base URL. Revoke any key that has appeared in an exception dump or public log.

### 404 endpoint or model not found

The base URL is `https://taodock.com/v1`; the SDK appends paths. A full operation path can be duplicated. If model listing works, use one of its exact IDs and confirm the key's permissions and Taodock channel availability.

### 429 or quota errors

Rate limits and quota are different conditions even when an SDK surfaces similar status handling. Inspect the sanitized response and Taodock records. Use bounded exponential backoff only for retryable rate or transient failures. Increasing a key limit is an access decision, not a generic error-recovery step.

### Timeout or upstream failure

Set explicit client timeouts appropriate for the endpoint and model. Preserve error type, status, request identifier, model, and duration while excluding prompts and secrets where possible. Define whether the application or Taodock owns retries and fallback so both layers do not independently duplicate requests.

### Unsupported parameters

Remove optional fields until the smallest request succeeds, then restore them one at a time. Optional parameters and zero values may have meaningful semantics. Consult the Taodock API guide and the chosen model's capability rather than assuming an SDK method maps identically across providers.

## Production checklist

Use separate least-privilege keys per service and environment. Keep secrets in a vault or managed runtime store, rotate them, and revoke unused credentials. Pin and test SDK upgrades. Apply request timeouts, bounded concurrency, and intentional retry rules. Monitor error distribution, latency, usage, and quota without recording authentication headers or sensitive prompt content.

Before migration, run representative non-streaming, streaming, tool, cancellation, and error fixtures. Compare response shape and usage with the previous path. Roll out gradually and keep a reversible configuration until the new gateway has handled normal traffic and failure conditions.
