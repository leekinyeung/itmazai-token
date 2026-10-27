# Make your first API call

The TaoDock console and API are both available at **https://taodock.com**. Follow these steps to create an account and receive your first model response.

## 1. Register and sign in {#account}

1. Open the [TaoDock registration page](https://taodock.com/sign-up).
2. Enter your username, password, and an email address you can access. TaoDock currently requires email verification: request a code, check your inbox, and enter the code on the registration page.
3. Read the user agreement and privacy policy linked on the page, then complete registration.
4. [Sign in](https://taodock.com/sign-in) and open the [console overview](https://taodock.com/dashboard/overview).

If you already have an account, sign in directly. For missing emails, check the address, spam folder, and resend countdown. See the [FAQ](./faq.md#email).

## 2. Check your balance and model {#model}

Check your available quota in [Wallet](https://taodock.com/wallet), then confirm the model and current price in [Model Square](https://taodock.com/pricing). TaoDock currently displays quota in **USD**. Your API key's quota limit is separate from your account balance.

This guide uses `gpt-6.1-sol`, which is listed in the current TaoDock catalog. Use the exact ID. If the key cannot access it, choose another text chat model available to your account.

## 3. Create your API key {#key}

Open [API Keys](https://taodock.com/keys) and select **Create API Key**:

- Give it a recognizable name, such as `First integration`.
- Start with the default group offered for your account.
- Set a quota and expiration as needed. Leave uncertain IP or model restrictions unset while establishing your first connection.
- Save and copy the key. Clients use the TaoDock API key, not your sign-in password.

Create separate keys for separate applications. See [API key management](./guide/api-keys.md).

## 4. Read your key and list models {#verify}

Run these commands in Bash or Zsh on macOS or Linux. Paste the key when prompted; input is hidden and the key is not stored as a literal in your command history.

```bash
printf 'Enter your TaoDock API key: '
read -r -s TAODOCK_API_KEY
printf '\n'
export TAODOCK_API_KEY

curl --fail-with-body --silent --show-error https://taodock.com/v1/models \
  -H "Authorization: Bearer $TAODOCK_API_KEY"
```

A successful response contains a JSON `data` list. Each `id` is a model ID you can use in requests or clients. Listing models does not generate model content.

For Windows PowerShell:

```powershell
$secureKey = Read-Host 'Enter your TaoDock API key' -AsSecureString
$env:TAODOCK_API_KEY = [System.Net.NetworkCredential]::new('', $secureKey).Password
Invoke-RestMethod -Uri 'https://taodock.com/v1/models' -Headers @{
    Authorization = "Bearer $env:TAODOCK_API_KEY"
}
```

## 5. Send a chat request {#chat}

Continue in the same macOS or Linux terminal:

```bash
curl --fail-with-body --silent --show-error https://taodock.com/v1/chat/completions \
  -H "Authorization: Bearer $TAODOCK_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "gpt-6.1-sol",
    "messages": [
      { "role": "user", "content": "Hello, please introduce yourself in one sentence." }
    ]
  }'
```

After reading your key in PowerShell, use:

```powershell
$body = @{
    model = 'gpt-6.1-sol'
    messages = @(@{ role = 'user'; content = 'Hello, please introduce yourself in one sentence.' })
} | ConvertTo-Json -Depth 5
$response = Invoke-RestMethod -Method Post -Uri 'https://taodock.com/v1/chat/completions' `
    -Headers @{ Authorization = "Bearer $env:TAODOCK_API_KEY" } `
    -ContentType 'application/json' -Body ([System.Text.Encoding]::UTF8.GetBytes($body))
$response.choices[0].message.content
```

A normal text chat response is in `choices[0].message.content`. Generation consumes quota; check TaoDock's recorded charge for the settled amount.

## 6. Check the record and connect an application {#next}

Find the request in [Common Logs](https://taodock.com/usage-logs/common) and check its model, time, status, and charge. Once you receive a response and find the corresponding record, [connect an AI client](./guide/clients.md) or [integrate your application](./api/overview.md).

If the call fails, keep the error response and follow the [troubleshooting order](./faq.md#troubleshoot) before sending repeated requests.
