---
kind: faq
slug: faq
title: Taodock AI API Frequently Asked Questions
description: Answers about Taodock accounts, API keys, OpenAI-compatible endpoints, models, quota, security, client setup, and common request errors.
primaryKeyword: AI API FAQ
cluster: Taodock support
publishedAt: 2026-11-04
updatedAt: 2026-11-04
sources:
  - label: Taodock API integration overview
    url: https://docs.taodock.com/en/api/overview.html
  - label: Taodock client guides
    url: https://docs.taodock.com/en/guide/clients.html
related:
  - /integrations
  - /integrations/openai-sdk
  - /models
  - /compare
faqItems:
  - question: How do I create a Taodock account?
    answer: Open the sign-up page, complete the required registration and verification steps, then sign in. Registration availability and methods may depend on the current deployment settings.
  - question: Where do I create a Taodock API key?
    answer: After signing in, open the API keys area and create a key. Give each application or environment its own key so permissions, quota, rotation, and revocation can be managed independently.
  - question: Can I recover the full value of an API key later?
    answer: Treat the value shown at creation as a secret and store it securely. If a usable key value is lost or exposed, revoke it and create a replacement instead of sharing or logging it.
  - question: What base URL should OpenAI-compatible clients use?
    answer: Most clients and SDKs should use https://taodock.com/v1. Some client presets, such as a host-oriented New API preset, may require https://taodock.com instead; follow the client-specific integration guide.
  - question: How do I find the correct model ID?
    answer: Use Taodock's model page or call the /v1/models endpoint with the same API key. Copy the exact API ID returned to that key rather than guessing from a display name.
  - question: Does Taodock support every OpenAI API endpoint and parameter?
    answer: No universal compatibility claim applies to every endpoint, field, model, and upstream provider. Check the API guide and test the exact endpoint, model, and optional parameters your application uses.
  - question: Why can my key see one model but not another?
    answer: Model visibility can depend on key restrictions, user group, configured channels, model availability, and deployment policy. Compare the key's permissions with the live model list.
  - question: What is the difference between account balance and key quota?
    answer: Account resources apply to the account, while a key can have a narrower usage limit. A request may be rejected by the key's limit even when the account still has available balance.
  - question: How are request charges determined?
    answer: Charges depend on the selected model, usage, pricing configuration, and applicable billing rules. Review the current pricing page and the request's usage record rather than relying on a permanent value in a tutorial.
  - question: What does a 401 error mean?
    answer: The API key is normally missing, invalid, disabled, expired, or sent to the wrong service. Recheck the Authorization value and base URL, and rotate the key if it may have been exposed.
  - question: What should I check for a 404 response?
    answer: Confirm the base URL and operation path, then verify the exact model ID. Avoid adding /v1 or a resource path twice when a client already appends it.
  - question: Why am I receiving a 429 or quota error?
    answer: Inspect whether the response represents rate limiting, account resources, or a key-level quota. Do not retry indefinitely; correct the limit or use bounded retries only for transient rate conditions.
  - question: Why does streaming work on one network but not another?
    answer: VPNs, reverse proxies, antivirus inspection, and corporate networks can buffer or terminate event streams. Compare a non-streaming request and a direct network before changing model or gateway settings.
  - question: Why do tools, images, or files fail when text chat works?
    answer: Basic chat compatibility does not prove advanced feature support. Confirm the exact model and channel support the request format and capability, then test the smallest feature-specific request.
  - question: Is it safe to put a Taodock key in browser JavaScript?
    answer: No. Code delivered to a public browser exposes the key to visitors. Keep the key in a trusted backend or controlled local client and have the browser call your authenticated server.
  - question: Should a team share one API key?
    answer: Prefer separate keys per application, environment, team, or user boundary. Separate credentials improve least privilege, usage attribution, rotation, incident containment, and revocation.
  - question: Which desktop and self-hosted clients can connect to Taodock?
    answer: OpenAI-compatible clients can often connect by changing their base URL, key, and model. Taodock publishes guides for Cherry Studio, WorkBuddy, Open WebUI, AionUi, DeepChat, and SDK integrations.
  - question: What information should I include when troubleshooting a failed request?
    answer: Share the timestamp, endpoint, model, status, non-secret request identifier, client version, and a sanitized error. Never share API keys, Authorization headers, passwords, private prompts, or other credentials.
draft: false
---

## Accounts and access

Taodock separates account access from API credentials. Sign in to manage keys, models, quota, and request records. Applications should use dedicated API keys instead of browser session credentials. A key can be narrowed to the models and usage appropriate for one workload, making it safer to rotate or revoke without disrupting unrelated systems.

Store credentials in a secret manager or controlled client configuration. Never commit a key, place it in a public browser bundle, or copy it into screenshots and issue reports. If exposure is possible, revoke the key and replace it.

## Models, protocols, and usage

The live model list is the authority for what a particular key can access. OpenAI compatibility makes common clients and SDKs easier to configure, but capabilities still vary by endpoint, model, channel, and request fields. Validate ordinary responses, streaming, errors, and every advanced feature your application relies on.

Quota and pricing are operational settings rather than permanent tutorial facts. Check current pricing and the actual usage record for a request. Give development, staging, production, and independent clients separate keys so limits and activity remain understandable.

## Diagnosing a request

Begin with the smallest non-streaming text request using an exact model ID. Confirm the base URL, key status, permissions, and quota. Then add streaming, tools, images, files, or other optional fields one at a time. This sequence reveals whether the problem is connectivity, authentication, model access, or a particular feature.

When requesting support, provide non-secret context: time, endpoint, model, status, request identifier, client version, and sanitized error. Remove keys, authorization headers, private prompt content, and personal data.
