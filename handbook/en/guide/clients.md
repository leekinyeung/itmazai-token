# Connect an AI client

Prepare three values: **the TaoDock API address, your own API key, and an available model ID**. Create the key on [API Keys](https://taodock.com/keys), and find models in [Model Square](https://taodock.com/pricing).

## Connection settings {#settings}

| Client field | TaoDock value |
| --- | --- |
| Provider name | `TaoDock` |
| Provider type / protocol | OpenAI-compatible for standard text chat |
| API Key | Your complete key copied from TaoDock **API Keys** |
| First test model | `gpt-6.1-sol`, provided it is available to your key |

**Choose one address according to the path your client appends:**

| Path the client appends | Address to enter |
| --- | --- |
| `/chat/completions` | `https://taodock.com/v1` |
| `/v1/chat/completions` | `https://taodock.com` |

Both configurations must produce the same chat endpoint: `https://taodock.com/v1/chat/completions`. A field named Base URL or API Host does not, by itself, tell you whether to include `/v1`. Check the client's path handling; the Cherry Studio and Open WebUI instructions below give their specific settings.

Read documentation at `https://docs.taodock.com`; send model API requests to `https://taodock.com`.

## Import a connection from the console {#import}

1. Install and launch the client on your computer.
2. Open [TaoDock API Keys](https://taodock.com/keys).
3. Find the key for this client, open its row action menu, and select the **Chat** submenu.
4. Choose a client such as **Cherry Studio, AionUI, or DeepChat**, and follow the application's import prompts.
5. Confirm the imported address points to TaoDock, select an available chat model, and send a short message.

These actions open the local application through its application link. If nothing opens, check that the client is installed and allow the browser to open its link. If import still fails, use manual configuration below.

## Configure Cherry Studio manually {#cherry-studio}

1. Open **Settings → Model Provider** in Cherry Studio.
2. Add an **OpenAI-compatible** provider named `TaoDock`.
3. Add your TaoDock key in the API Key field.
4. Set API Host to **`https://taodock.com`**. Cherry Studio adds `/v1/chat/completions` for this configuration.
5. Fetch or sync models, then add `gpt-6.1-sol` or another accessible chat model.
6. Save, enable the provider, and select the model in a chat to send a short message.

If your version requires a versioned base address, use `https://taodock.com/v1/` without appending `chat/completions`. See [Cherry Studio's connection settings](https://cherryai.com/docs/en/pre-basic/settings/providers/) for client-specific details.

## Configure Open WebUI {#open-webui}

You need permission to manage connections in Open WebUI.

1. Open **Settings → Admin → Connections**.
2. Add an OpenAI connection with URL **`https://taodock.com/v1`**.
3. Enter your TaoDock API key and save.
4. Verify the connection and fetch the model list, then select an available chat model.
5. Return to chat and send a short test message.

If models do not appear automatically, add their full TaoDock IDs to the connection's Model IDs. See the [Open WebUI connection guide](https://docs.openwebui.com/getting-started/quick-start/connect-a-provider/starting-with-openai-compatible/) for the current interface.

## Other OpenAI-compatible applications {#other-clients}

Enter `https://taodock.com/v1` if the client appends only `/chat/completions`. Enter `https://taodock.com` if it appends the full `/v1/chat/completions` path. Both must produce:

```text
https://taodock.com/v1/chat/completions
```

An OpenAI-compatible connection can use Claude models listed by TaoDock as supporting that protocol; keep the TaoDock domain. Applications using the native Claude protocol should follow the [API endpoint guide](../api/overview.md#endpoints).

## Confirm the integration works {#verify}

- The client receives a normal model response.
- [TaoDock Common Logs](https://taodock.com/usage-logs/common) contains a request for that time and model.
- The wallet and API key have enough quota to continue.

Loading a model list confirms only model discovery. Complete verification requires a real message. Client model checks and test messages may consume quota.

## First checks when a connection fails {#troubleshoot}

| Symptom | Check first |
| --- | --- |
| HTML page or 404 | Documentation domain entered as the API URL, duplicated `/v1/v1`, or duplicated endpoint paths |
| Invalid key / 401 | A complete TaoDock key that is active and has not expired |
| Model unavailable | Exact ID, protocol, key model restrictions, and group |
| Insufficient quota | Both wallet balance and key quota |
| Import does not open | Client installation and browser permission to open the application link |

See the [FAQ](../faq.md) for more troubleshooting.
