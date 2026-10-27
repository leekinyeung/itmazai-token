# Choose a model and protocol

Browse the current catalog in [TaoDock Model Square](https://taodock.com/pricing). Check the **model ID, supported protocols, available groups, and price** together, rather than relying on a display name.

## Models in the current catalog {#catalog}

These IDs were checked against the TaoDock catalog on October 26, 2026.

| Goal | IDs to find in Model Square | Connection |
| --- | --- | --- |
| Text chat and application integration | `gpt-6.1-sol`, `gpt-6-sol`, `gpt-6-luna` | OpenAI-compatible chat |
| Chat with Claude | `claude-sonnet-4.6`, `claude-haiku-4-5` | OpenAI-compatible chat or Anthropic Messages |
| Image generation | `gpt-image-2`, `gpt-image-2.5` | Image generation endpoint and a client supporting it |

This is not the full catalog. Check [Model Square](https://taodock.com/pricing) for changes. Query `https://taodock.com/v1/models` for IDs actually available to a particular key, as described in the [quick start](../quick-start.md#verify).

## Copy the complete model ID {#model-id}

Requests and clients use the ID. Do not add provider prefixes or interchange punctuation in IDs such as `claude-sonnet-4.6` and `claude-sonnet-4-6`. Use the exact ID returned in the list.

Establish a simple text conversation before enabling tools, long context, or other advanced features. Use image models through the image endpoint and a suitable application rather than testing them as ordinary text models solely because of their name.

## Groups and API keys {#groups}

TaoDock groups distinguish model access and service configuration. The key creation form lists the groups your account can choose.

- Start with the default group offered for your account.
- Check that the key's group permits a specific model before using it.
- Prices and service conditions for the same model may differ between groups; check the current quote before switching.
- Use Auto grouping only when it is offered to your account, following the order and rules shown in the interface.

Choose a group from the provided list rather than entering an arbitrary name to make a model appear. See [key restrictions](./api-keys.md#restrictions).

## Match the model to the protocol {#protocol}

| Protocol | TaoDock endpoint | Applications |
| --- | --- | --- |
| OpenAI-compatible chat | `https://taodock.com/v1/chat/completions` | Most chat clients and general applications |
| Anthropic Messages | `https://taodock.com/v1/messages` | Applications requiring Claude's native message protocol |
| Image generation | `https://taodock.com/v1/images/generations` | Clients and programs supporting image generation |

Check the model's listed endpoints in Model Square. If the protocol is wrong, correct the application's protocol setting instead of repeatedly changing the spelling of the model ID.
