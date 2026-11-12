---
kind: integration
slug: open-webui
title: Connect Open WebUI to Taodock's OpenAI-Compatible API
description: Add Taodock as an OpenAI connection in Open WebUI, test model discovery and chat, and troubleshoot credentials, permissions, quota, and streams.
primaryKeyword: Taodock Open WebUI integration
cluster: Self-hosted AI client integrations
subject: Open WebUI
publishedAt: 2026-11-04
updatedAt: 2026-11-04
reviewedAt: 2026-11-04
sources:
  - label: Taodock Open WebUI guide
    url: https://docs.taodock.com/en/guide/open-webui.html
  - label: Taodock client guides
    url: https://docs.taodock.com/en/guide/clients.html
  - label: Taodock API integration overview
    url: https://docs.taodock.com/en/api/overview.html
related:
  - /integrations/openai-sdk
  - /integrations/cherry-studio
  - /compare/taodock-vs-litellm
  - /models
steps:
  - title: Create a key for the Open WebUI deployment
    description: Issue a restricted Taodock key for this instance and decide which models and quota its users may consume.
  - title: Open the connection settings
    description: In Open WebUI, open Admin Settings, choose Connections, and add an OpenAI-compatible connection.
  - title: Enter the Taodock connection values
    description: Set the OpenAI URL to https://taodock.com/v1 and provide the dedicated Taodock API key.
  - title: Discover and test models
    description: Refresh the model list, select an exact available model, send a test chat, and verify the corresponding Taodock request record.
docsUrl: https://docs.taodock.com/en/guide/open-webui.html
faqItems:
  - question: Where is Taodock configured in Open WebUI?
    answer: An Open WebUI administrator adds it under Admin Settings, Connections, as an OpenAI-compatible connection.
  - question: What OpenAI URL should Open WebUI use?
    answer: Set the URL to https://taodock.com/v1 and use a dedicated Taodock API key.
  - question: Should one key be shared by multiple Open WebUI instances?
    answer: Separate keys are recommended so each instance can have its own model permissions, quota, usage attribution, rotation, and revocation.
draft: false
---

## Why connect Open WebUI through Taodock

Open WebUI provides a self-hosted interface for model conversations. Taodock provides an OpenAI-compatible API gateway that can expose permitted models through one endpoint and one restricted key. Connecting the two lets an administrator control model access, quota, upstream channels, and usage records in Taodock while users work in the Open WebUI interface.

The two systems still have different responsibilities. Open WebUI manages its users, conversation experience, and local deployment. Taodock authenticates its API key, selects an available channel according to gateway configuration, and records API usage. Decide who administers each layer before production use, especially when the Open WebUI instance serves several people.

## Prerequisites and access design

You need administrator access to Open WebUI and permission to create Taodock API keys. The Taodock account must have quota and at least one usable model. Create a dedicated key for the Open WebUI instance rather than using a personal key copied from another client.

Restrict the key to the intended models and set a quota based on the number of users and expected traffic. Taodock sees requests under the gateway key, so a single shared connection may not provide per-user attribution by itself. Use Open WebUI's own user controls for interface access and review both systems' records when investigating activity.

List models with the dedicated key before configuration. This proves that the key is active and establishes the exact identifiers Open WebUI should receive. It also separates gateway authorization problems from client setup problems.

## Configure the connection

Sign in to Open WebUI as an administrator. Open **Admin Settings**, choose **Connections**, and add an OpenAI-compatible connection. Enter:

- **OpenAI URL:** `https://taodock.com/v1`
- **API key:** the dedicated Taodock key for this Open WebUI instance

The URL should stop at `/v1`. Do not append `/models` or `/chat/completions`; Open WebUI calls those operations itself. Save the connection and refresh the model list. Select one exact Taodock model for the initial test.

If the instance already has other OpenAI-compatible connections, name the connection clearly so administrators can tell which models and errors belong to Taodock. Avoid disabling a working connection until the new path is verified.

## Test model discovery and chat

First confirm that Open WebUI displays models available to the dedicated key. If the list is empty, do not manually invent an ID as the first response; inspect the connection, key permissions, and Taodock model list.

Start a new chat with one known model and send: `Answer with exactly: Open WebUI connected to Taodock.` Confirm the response appears. In Taodock, find the request at the same time and verify its key, model, status, and usage. This proves that the visible response used the intended gateway rather than another configured provider.

Test streaming with a longer response. Then test each production capability—tools, images, files, structured output, or reasoning controls—separately. OpenAI-compatible endpoints can accept ordinary chat while a particular model or channel does not support an advanced field. Use sanitized prompts in tests and preserve request identifiers instead of secrets.

## Troubleshooting checklist

### The model list is empty

Verify the URL includes `/v1` and that the key is copied exactly. Call Taodock's model endpoint using the same key. If the direct list is also empty or rejected, fix its model permissions, group, status, or quota before changing Open WebUI. If the direct list works, review Open WebUI server logs for a connection or TLS error and restart or refresh the connection as appropriate for the deployment.

### Open WebUI reports unauthorized

A 401 generally means the API key is missing, invalid, disabled, or sent to the wrong endpoint. Replace the key if it may have been exposed. Remember that a secret stored in a server-side administrator connection should not be placed in browser-visible custom JavaScript or shared screenshots.

### A selected model returns 404 or unavailable

Copy the exact model identifier returned to this key. Check that Taodock has a usable channel for the model and that the key's group can access it. If several models work and one fails, treat it as a model or provider path issue rather than rebuilding the entire connection.

### Requests fail for quota

Inspect the Taodock account balance and the key-specific quota. A shared interface can consume a narrow key limit faster than a single desktop client. Increase limits intentionally and monitor usage; do not replace the key with an unrestricted administrator credential as a shortcut.

### Streaming hangs behind a reverse proxy

Try non-streaming chat and a direct network route. Reverse proxies in front of either Open WebUI or the client may buffer server-sent events or apply short timeouts. Review proxy streaming and idle-timeout configuration, but keep authentication headers out of diagnostic output.

### Tools, images, or files fail

Confirm capability support for the exact model and Taodock channel. Reduce the request to the smallest failing example and compare it with an API call that uses the same fields. Some client features transform files or tool schemas before sending them, so a basic text test cannot validate those paths.

## Production operations

Use separate Taodock keys for development, staging, and production Open WebUI instances. Rotate keys through the administrator connection and verify a test request before revoking the old credential. Record the key's owner, allowed models, and quota policy without recording the secret.

Monitor repeated errors and unexpected model usage. When many Open WebUI users share one gateway credential, pair Taodock's aggregate API record with Open WebUI's own audit or user context. Define which administrator handles client access, which handles gateway routing, and who responds when an upstream provider is unavailable.

Revisit the official Taodock Open WebUI guide after significant client upgrades. The exact menu labels can change, while the core connection remains the Taodock `/v1` base URL plus a restricted API key.
