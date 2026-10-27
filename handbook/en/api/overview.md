# API integration

TaoDock's API service is **https://taodock.com**, with OpenAI-compatible Base URL **`https://taodock.com/v1`**. The code below uses TaoDock's actual addresses and reads your own key from the terminal or environment.

## Addresses and endpoints {#endpoints}

| Purpose | Method | Address |
| --- | --- | --- |
| Console | Browser | `https://taodock.com` |
| OpenAI-compatible Base URL | Client or program configuration | `https://taodock.com/v1` |
| List models available to the key | GET | `https://taodock.com/v1/models` |
| Text chat | POST | `https://taodock.com/v1/chat/completions` |
| Anthropic Messages | POST | `https://taodock.com/v1/messages` |
| Image generation | POST | `https://taodock.com/v1/images/generations` |

Base URL in this table means the base address used by a program. If a client adds `/v1` itself, enter `https://taodock.com` in its address field. Follow the [client's path handling](../guide/clients.md#settings) rather than relying on the field name alone.

Generation endpoints require a model supporting the corresponding protocol. See the [model guide](../guide/models.md#protocol) for protocols listed in the current public catalog. Do not use the documentation domain `docs.taodock.com` as the API service address.

## Prepare your key {#credentials}

Create a key on [TaoDock API Keys](https://taodock.com/keys). The cURL and JavaScript code reads `TAODOCK_API_KEY`. Set it in Bash or Zsh without putting the key directly in a script:

```bash
printf 'Enter your TaoDock API key: '
read -r -s TAODOCK_API_KEY
printf '\n'
export TAODOCK_API_KEY
```

Requests authenticate with the `Authorization: Bearer` header. Run application code on your own server, keeping the key out of browser bundles.

## cURL: models and chat {#curl}

List available models:

```bash
curl --fail-with-body --silent --show-error https://taodock.com/v1/models \
  -H "Authorization: Bearer $TAODOCK_API_KEY"
```

Send a text chat request:

```bash
curl --fail-with-body --silent --show-error https://taodock.com/v1/chat/completions \
  -H "Authorization: Bearer $TAODOCK_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"model":"gpt-6.1-sol","messages":[{"role":"user","content":"Briefly explain how to connect to the TaoDock API."}]}'
```

## Python {#python}

Save as `taodock_chat.py` and run `python3 taodock_chat.py`. Only the Python standard library is needed. If the environment variable is absent, the program prompts for your key.

```python
import getpass
import json
import os
import urllib.error
import urllib.request

api_key = os.environ.get("TAODOCK_API_KEY") or getpass.getpass("TaoDock API Key: ")
payload = {
    "model": "gpt-6.1-sol",
    "messages": [{"role": "user", "content": "Hello, please introduce yourself in one sentence."}],
}
request = urllib.request.Request(
    "https://taodock.com/v1/chat/completions",
    data=json.dumps(payload).encode("utf-8"),
    headers={
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    },
    method="POST",
)
try:
    with urllib.request.urlopen(request, timeout=90) as response:
        result = json.load(response)
    print(result["choices"][0]["message"]["content"])
except urllib.error.HTTPError as error:
    print(f"HTTP {error.code}: {error.read().decode('utf-8')}")
```

## JavaScript / Node.js {#javascript}

Read the environment variable as described above, save the code as `taodock-chat.mjs`, and run `node taodock-chat.mjs` with Node.js 22 or later. It uses the built-in `fetch` without additional dependencies.

```javascript
const apiKey = process.env.TAODOCK_API_KEY
if (!apiKey) throw new Error('Set the TAODOCK_API_KEY environment variable first')

const response = await fetch('https://taodock.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-6.1-sol',
    messages: [{ role: 'user', content: 'Hello, please introduce yourself in one sentence.' }],
  }),
  signal: AbortSignal.timeout(90000),
})
if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`)
const result = await response.json()
console.log(result.choices[0].message.content)
```

## Streaming chat {#streaming}

Set `stream` to `true` to receive the response incrementally. The `-N` option makes cURL display incoming data without buffering.

```bash
curl --fail-with-body --silent --show-error -N https://taodock.com/v1/chat/completions \
  -H "Authorization: Bearer $TAODOCK_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"model":"gpt-6.1-sol","messages":[{"role":"user","content":"Introduce yourself in three sentences."}],"stream":true}'
```

Read streaming output as SSE `data:` events. Text increments are normally in `choices[0].delta.content`; do not parse the entire stream as a single JSON document. After a client timeout, check [request logs](https://taodock.com/usage-logs/common) before retrying.

## Troubleshoot errors {#errors}

Keep the HTTP status and response error, then follow the [FAQ checks](../faq.md#troubleshoot). The model `gpt-6.1-sol` used in the code must be available to your key. To select another, copy an exact `id` from `/v1/models`.
