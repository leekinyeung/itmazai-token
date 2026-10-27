# FAQ

## In what order should I troubleshoot? {#troubleshoot}

1. Check how the client builds URLs and confirm that the final text chat endpoint is `https://taodock.com/v1/chat/completions`.
2. Check that the key comes from [TaoDock API Keys](https://taodock.com/keys), is enabled, and has not expired.
3. Query `https://taodock.com/v1/models` to confirm the model ID and key access.
4. Check both [Wallet](https://taodock.com/wallet) balance and the key's remaining quota.
5. Find the request by time and model in [Common Logs](https://taodock.com/usage-logs/common), keeping the specific error.

## My registration verification email did not arrive {#email}

TaoDock currently requires email verification for registration. Check the address, spam folder, and mail filters. Wait for the resend countdown before trying again. If messages still do not arrive, note the time and page error and use the support contact offered on TaoDock.

Do not share email verification codes or use them as API keys.

## Which API address should I enter? {#address}

| How the request path is completed | Value to enter |
| --- | --- |
| Client appends `/chat/completions` | `https://taodock.com/v1` |
| Client appends `/v1/chat/completions` | `https://taodock.com` |
| Direct cURL chat request | `https://taodock.com/v1/chat/completions` |

The first two rows describe different clients: choose the matching row. They produce the same endpoint. A field name such as Base URL or Host alone cannot tell you whether to include `/v1`.

Read guides at `https://docs.taodock.com`. If you receive HTML, a 404, or a duplicated `/v1/v1` path, correct the address first. See [client setup](./guide/clients.md).

## 401, invalid key, or access denied {#credentials}

Copy the complete TaoDock key, removing accidental whitespace, newlines, or quotation marks. Check that it is not a password or another platform's key. Verify key status, expiration, and IP and model restrictions.

Programs use the `Authorization: Bearer` header. Keep the key out of public URLs.

## Model not found or no available channel {#model}

Copy the exact model ID from [Model Square](https://taodock.com/pricing) or `/v1/models`, and check the protocol and key group. Do not change punctuation or add provider prefixes yourself.

If the model and permissions are correct but the service consistently reports no available channel, report the model, time, and request ID. Repeatedly editing the client's model name usually cannot resolve service availability.

## I have a balance but requests report insufficient quota {#quota}

Account balance and key quota are separate limits. Check [Wallet](https://taodock.com/wallet), then the key's remaining quota, restrictions, and expiration on [API Keys](https://taodock.com/keys). If using a plan, also check its validity.

Unlimited quota on a key does not mean free or unlimited account usage. See [Wallet and usage](./guide/wallet.md).

## 429 or too many requests {#rate-limit}

Reduce concurrency. Follow any retry timing in the response, and implement backoff with progressively longer waits rather than immediate repeated requests. Keep the response and time if limits persist.

## Timeouts, 502, or 503 {#connection}

Check your network and client proxy settings, then compare a simple request using the same key and model. Check [usage logs](https://taodock.com/usage-logs/common) to see whether the request executed.

Keep HTTPS certificate verification enabled. Check the domain, system clock, and proxy first. If multiple applications fail for the same model, report the error to TaoDock.

## Playground works, but my client does not {#client}

Playground uses account access; the client is also subject to its API key's group, model, IP, and quota restrictions. Select the same model in both and review the [client settings](./guide/clients.md#settings).

## My task was submitted, but there is no result yet {#tasks}

Check the status and task ID in [Task Logs](https://taodock.com/usage-logs/task). Submission is not completion. Follow the task status rather than creating duplicate tasks while waiting.

## How do I report an issue? {#support}

Include the time and time zone, client name and version, model ID, HTTP status, error response, and any request or task ID. For funding issues, include the order ID and amount.

Remove complete API keys, passwords, verification codes, and private conversations before using the contact channel actually offered on TaoDock. See the [About page](https://taodock.com/about) for platform information.
