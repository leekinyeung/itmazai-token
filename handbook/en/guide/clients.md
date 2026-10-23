# Connect an AI client

This guide applies to clients that support custom OpenAI-compatible endpoints. Field names and URL handling vary between clients, so also check your client's configuration instructions.

## Prepare three values

| Setting | Value |
| --- | --- |
| API address / Base URL | Usually `https://your-site.example/v1`; follow your client's requirements |
| API Key | A key created on the Taodock **API Keys** page |
| Model name | The full model ID copied from Model Square |

If the client offers an **OpenAI-compatible** or **Custom provider** option, select it and enter these values. Some clients append `/v1` automatically. For those clients, enter the site root URL to avoid a duplicated `/v1/v1` path.

## Test the connection

Save the configuration, select your model, and send a short message. After receiving a reply, check the request record in Taodock **Usage Logs**.

## If the connection fails

1. Check that you entered the service site domain. The documentation domain does not provide model APIs.
2. Check for duplicated `/v1` or `/chat/completions` paths.
3. Check that the key is valid, the account has available quota, and the model name is correct.
4. Compare the configuration with the cURL example in the [quick start](../quick-start.md) and keep the specific error message.

For more troubleshooting steps, read the [FAQ](../faq.md).
