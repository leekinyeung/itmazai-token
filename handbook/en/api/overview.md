# API integration

This page explains the basic URL conventions for OpenAI-compatible endpoints. Available endpoints and model capabilities depend on your site's configuration.

## Understand the three URL types

| Name | Placeholder example | Purpose |
| --- | --- | --- |
| Site URL | `https://your-site.example` | Open the console, or let a client append the endpoint path |
| Base URL | `https://your-site.example/v1` | Configure an SDK or client that expects an OpenAI-compatible base URL |
| Full endpoint URL | `https://your-site.example/v1/chat/completions` | Send a chat request directly over HTTP |

`your-site.example` is a placeholder domain and must be replaced. Documentation and API services can use different domains, so use the API address provided by your service site.

## Request authentication

Include your API key in requests from your server:

```http
Authorization: Bearer YOUR_API_KEY
```

## List available models

```sh
curl 'https://your-site.example/v1/models' \
  -H 'Authorization: Bearer YOUR_API_KEY'
```

Results depend on your account, API key permissions, and site configuration. Before sending a chat request, also check that the selected model supports the chat endpoint.

## Send a chat request

Follow the example in [Make your first API call](../quick-start.md). Set `model` to the full model ID and provide the conversation as a `messages` list.

## Handle errors

Keep the HTTP status code and error message from the response, then use the [FAQ](../faq.md) to investigate. When contacting your administrator, include the time, model name, and request ID, without disclosing your full API key.
