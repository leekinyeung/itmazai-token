---
title: "AI Client and Agent Integration Guides"
description: "Choose a TaoDock integration for Cherry Studio, WorkBuddy, Open WebUI, AionUI or DeepChat, with setup and troubleshooting guides."
---

# Connect AI clients and Agent tools

Prepare three values: **the TaoDock API address, your own API key, and an available model ID**. Create the key on [API Keys](https://taodock.com/keys), and find models in [Model Square](https://taodock.com/pricing).

## Choose your tool {#tools}

| Tool | TaoDock connection method | Guide |
| --- | --- | --- |
| Cherry Studio | Import from the console or configure a provider manually | [Import and use Agents](./cherry-studio.md) |
| WorkBuddy desktop | Add a custom model in the application | [Connect TaoDock manually](./workbuddy.md) |
| AionUI | Import from the console or add a custom model | [Import and select the Built-in Agent](#aionui) |
| DeepChat | Import from the console or add an OpenAI-compatible provider | [Import and enable models](#deepchat) |
| Open WebUI | Add an OpenAI connection in administration | [Configure the connection](./open-webui.md) |

Importing connects the application to TaoDock models. Configure working directories, Skills, MCP, and action permissions separately in the application. These instructions cover desktop clients; each section links to official downloads or documentation because menus change between versions.

Click a screenshot to enlarge it. API keys are masked or blank; enter your own TaoDock key when configuring the application. Your account determines which models are available.

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

Both configurations must produce the same chat endpoint: `https://taodock.com/v1/chat/completions`. A field named Base URL or API Host does not, by itself, tell you whether to include `/v1`. Follow the instructions for your tool below.

Read documentation at `https://docs.taodock.com`; send model API requests to `https://taodock.com`.

## Import a connection from the console {#import}

1. Install and launch the client on your computer.
2. Open [TaoDock API Keys](https://taodock.com/keys).
3. Find the key for this client, open its row action menu, and select the **Chat** submenu.
4. Choose a client such as **Cherry Studio, AionUI, or DeepChat**, and follow the application's import prompts.
5. Confirm the API domain is `taodock.com` and the key is filled in, then save and enable the provider. Its name may appear as **New API**; rename it to `TaoDock` if the application allows it.
6. Fetch or add models, explicitly select a model under that provider in a conversation, and send a short message.

These actions open the local application through its application link. If nothing opens, check that the client is installed and allow the browser to open its link. If import still fails, use manual configuration below.

Import links contain the selected key. Open them only in your own client and do not share them. If the application says it will overwrite an existing provider, check whether you still need its previous configuration. **TaoDock currently has no WorkBuddy import action**; use its custom model instructions below.

## Import and configure Cherry Studio {#cherry-studio}
Open the dedicated [Cherry Studio API Setup and Import Guide](./cherry-studio.md) for configuration steps, verification and troubleshooting.

## Connect a WorkBuddy custom model {#workbuddy}
Open the dedicated [WorkBuddy Custom Model Setup Guide](./workbuddy.md) for configuration steps, verification and troubleshooting.

## Import and configure AionUI {#aionui}

### Step 1: Preparation {#aionui-prepare}

Install AionUI from its [official releases](https://github.com/iOfficeAI/AionUi/releases).

<IntegrationConversionCallout />

### Import from TaoDock

1. Choose **AionUI** in the TaoDock key row's **Chat** menu and allow the application to open.
2. Check the imported address and key. If fields are missing, fill them using the manual steps below and save.
3. Fetch or add accessible models in model settings, then select one in a conversation.

### Add a model manually

1. Open **Settings → Models → Add Model**, select **Custom**, and name it `TaoDock`.
2. Set Base URL to **`https://taodock.com/v1`** and enter your TaoDock API key.
3. Add `gpt-6.1-sol` or another accessible chat model. If a protocol selector appears, use **OpenAI-compatible**, then save.
4. Create a **Built-in Agent** conversation, select the configured model, and test a short message before tool calling.

<figure>
  <a href="/images/clients/aionui-platform.png" target="_blank" rel="noreferrer">
    <img src="/images/clients/aionui-platform.png" alt="Official AionUI Add Model screenshot showing Model settings, Add Model at the top right, and Custom as the first Model Platform option" width="2352" height="1354" loading="lazy" decoding="async" />
  </a>
  <figcaption>Figure 3 · <a href="https://github.com/iOfficeAI/AionUi/blob/main/resources/llm_newapi.png" target="_blank" rel="noreferrer">Official AionUI screenshot</a> locating Add Model and Custom. No TaoDock connection has been entered in this image. Click to enlarge.</figcaption>
</figure>

**Follow Figure 3:** ① Open Model settings; ② click Add Model; ③ select **Custom** at the top of Model Platform, then enter the values below. This manual method uses Custom.

| Field shown next | TaoDock value |
| --- | --- |
| Name, if offered | `TaoDock` |
| Base URL | `https://taodock.com/v1` |
| API Key | Your TaoDock API key |
| Model Name / ID | `gpt-6.1-sol` or another accessible chat model ID |

These steps configure AionUI's Built-in Agent. Other CLI Agents launched through AionUI have their own model and authentication settings; importing this provider does not configure all of them. See [AionUI model configuration](https://github.com/iOfficeAI/AionUi/wiki/LLM-Configuration) and [Getting Started](https://github.com/iOfficeAI/AionUi/wiki/Getting-Started).

<IntegrationConversionCallout />

## Import and configure DeepChat {#deepchat}

### Step 1: Preparation {#deepchat-prepare}

Install DeepChat from its [official releases](https://github.com/ThinkInAIXYZ/deepchat/releases).

<IntegrationConversionCallout />

### Import from TaoDock

1. Choose **DeepChat** in the TaoDock key row's **Chat** menu.
2. Check `taodock.com` and the key in DeepChat's provider import preview, then confirm. If the provider is unsupported, use manual configuration below.
3. Open model provider settings, find the imported **New API** provider, fetch models, and enable the ones you need.
4. Create a conversation, select a model under that provider, and send a short message.

### Add a provider manually

1. Open **Settings → Providers** (called Model Providers in some versions), click **Add Custom Provider**, and name it `TaoDock`.
2. Choose **OpenAI Completions (Chat Completions)**, which older versions may call OpenAI-compatible. Set Base URL to **`https://taodock.com/v1`** and enter your TaoDock API key.
3. Save the connection, refresh models, and enable `gpt-6.1-sol` or another accessible chat model. Add the full ID manually if it is missing.
4. Select the model in a conversation. Configure and enable any required tools separately before running the [first Agent task](#agent-check).

<figure>
  <a href="/images/clients/deepchat-custom.jpg" target="_blank" rel="noreferrer">
    <img src="/images/clients/deepchat-custom.jpg" alt="DeepChat Add Custom Provider form: name TaoDock, API type OpenAI Completions, API URL https://taodock.com/v1, a preview of the final chat/completions endpoint, and a blank API key field" width="2600" height="1600" loading="lazy" decoding="async" />
  </a>
  <figcaption>Figure 4 · Actual DeepChat 1.1.3 configuration interface in Chinese, with the API key left blank. Match the protocol and URL, then enter your own key. Click to enlarge.</figcaption>
</figure>

**Follow Figure 4:** ① Open Providers (服务商设置) on the left; ② click Add Custom Provider (添加自定义服务商) in the middle; ③ enter `TaoDock` and select **OpenAI Completions**; ④ enter `https://taodock.com/v1` and check the complete endpoint preview below; ⑤ enter your API key, then click Connect and Load Models (连接并加载模型). Save Without Testing (保存但不测试) can save first; fetch and enable models afterward. Saving alone does not verify the connection.

This configuration uses `/v1/chat/completions`. In some versions, the type labeled only **OpenAI** uses Responses; confirm that **OpenAI Completions** is selected. DeepChat supports custom compatible providers. Review import previews and any overwrite prompt. See the [official DeepChat project](https://github.com/ThinkInAIXYZ/deepchat) for its current interface and releases.

<IntegrationConversionCallout />

## Configure Open WebUI {#open-webui}
Open the dedicated [Open WebUI OpenAI-Compatible API Setup](./open-webui.md) for configuration steps, verification and troubleshooting.

## Other OpenAI-compatible applications {#other-clients}

Enter `https://taodock.com/v1` if the client appends only `/chat/completions`. Enter `https://taodock.com` if it appends the full `/v1/chat/completions` path. Both must produce:

```text
https://taodock.com/v1/chat/completions
```

An OpenAI-compatible connection can use Claude models listed by TaoDock as supporting that protocol; keep the TaoDock domain. Applications using the native Claude protocol should follow the [API endpoint guide](../api/overview.md#endpoints).

## Your first Agent task {#agent-check}

After a plain chat succeeds, check whether the Agent can actually use a tool:

1. Create a test folder on your computer. Add `notes.txt` containing “Connected to TaoDock.”
2. Select that working directory in the application, or allow its file tool to read the folder.
3. Confirm the selected model belongs to the TaoDock provider. Ask: “Use the file-reading tool to read notes.txt in the working directory and summarize it.”
4. Inspect the tool call record, file contents returned, and reply. A text answer alone does not prove that a tool ran.

If tools are unsupported, the file is missing, or permission is denied, check model/protocol compatibility, the working directory, tool switches, and application permissions respectively. Chat, tool use, and image generation require separate checks. An Agent task may make several model calls; review them in [TaoDock Common Logs](https://taodock.com/usage-logs/common).

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
| Model unavailable | Query `/v1/models` with that key, then check the exact ID, protocol, and key model restrictions; the key follows the account group |
| Insufficient quota | Both wallet balance and key quota |
| Import does not open | Client installation and browser permission to open the application link |
| TaoDock model missing in WorkBuddy | Save the custom model and explicitly select it in the conversation |
| Address or key empty after import | Client support for the import format; fill fields using the manual guide |
| Chat works but Agent tools do not run | Runtime compatibility, model tool support, enabled tools, and directory permissions |

See the [FAQ](../faq.md) for more troubleshooting.

TaoDock's client actions and the linked official materials were checked on **October 27, 2026**. Menus depend on the installed version; check model access and tool use separately using the steps above.
