# Make your first API call

This guide uses an OpenAI-compatible chat endpoint. You will need an active account, an API key, and access to a chat model.

## 1. Open the console

Open your Taodock site and sign in. If you do not have an account, follow the registration options on your site or ask the administrator to create one.

## 2. Choose a model and check your quota

Open **Model Square** to check model names and details, then open **Wallet** to check your available quota or plan. Copy the full model ID rather than using a name of your own.

## 3. Create an API key

Open **API Keys** and create a key for your application. Check its expiration date, quota, and model restrictions. Store the key securely, and keep it out of screenshots, public repositories, and browser frontend code.

## 4. Send a chat request

The address and API key below are placeholders. Replace the domain with your actual site address, replace `YOUR_MODEL_ID` with an available chat model ID, and enter your API key.

```sh
curl 'https://your-site.example/v1/chat/completions' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "YOUR_MODEL_ID",
    "messages": [
      { "role": "user", "content": "Hello, please introduce yourself in one sentence." }
    ]
  }'
```

After receiving a successful chat response containing `choices`, open **Usage Logs** to find the request. If the request fails, read the error in the response and check the [FAQ](./faq.md).

## Next steps

- [Connect an AI client](./guide/clients.md)
- [Understand API addresses and requests](./api/overview.md)
