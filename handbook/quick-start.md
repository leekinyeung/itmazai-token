# 完成第一次调用

TaoDock 的控制台和 API 均位于 **https://taodock.com**。按本页操作，可以从注册账号走到收到第一条模型回复。

## 1. 注册并登录 {#account}

1. 打开 [TaoDock 注册页面](https://taodock.com/sign-up)。
2. 填写用户名、密码和可收信的邮箱。TaoDock 当前启用邮箱验证，点击发送验证码后，在邮箱中查收并填回注册页面。
3. 阅读页面提供的用户协议和隐私政策，完成注册。
4. 在[登录页面](https://taodock.com/sign-in)登录，进入[控制台概览](https://taodock.com/dashboard/overview)。

已有账号可直接登录。未收到邮件时，先检查邮箱地址、垃圾邮件文件夹和发送按钮的倒计时，详见[常见问题](./faq.md#email)。

## 2. 确认余额和模型 {#model}

在[钱包](https://taodock.com/wallet)查看可用额度，再在[模型广场](https://taodock.com/pricing)确认要使用的模型与当前价格。TaoDock 当前以 **USD** 显示额度；密钥的额度限制与账户余额是两项独立限制。

本页使用当前模型目录中的 `gpt-6.1-sol` 演示文字对话。模型名称要完整一致；如果你的密钥不能访问这个模型，从模型广场选择账号可用的文字对话模型即可。

## 3. 创建自己的密钥 {#key}

打开 [API 密钥](https://taodock.com/keys)，点击「创建 API 密钥」：

- 名称可填写 `首次接入`，方便在列表中辨认。
- 分组先使用页面为账号提供的默认选项。
- 按需要设置额度和有效期；首次接入时先不要增加不确定的 IP 或模型限制。
- 保存后复制该密钥。客户端填写的是 TaoDock API 密钥，不是登录密码。

需要给多个应用授权时，为每个应用单独创建密钥，详见[密钥管理](./guide/api-keys.md)。

## 4. 读取密钥并查询模型 {#verify}

在 macOS 或 Linux 的 Bash / Zsh 终端运行以下命令。按提示粘贴你刚创建的密钥，输入过程不会回显，也不会把密钥写成命令历史中的字面量。

```bash
printf '请输入 TaoDock API 密钥：'
read -r -s TAODOCK_API_KEY
printf '\n'
export TAODOCK_API_KEY

curl --fail-with-body --silent --show-error https://taodock.com/v1/models \
  -H "Authorization: Bearer $TAODOCK_API_KEY"
```

成功时返回包含 `data` 列表的 JSON。列表中的 `id` 就是 API 请求和客户端需要填写的模型 ID。这一步查询模型列表，不生成模型内容。

Windows PowerShell 可使用：

```powershell
$secureKey = Read-Host '请输入 TaoDock API 密钥' -AsSecureString
$env:TAODOCK_API_KEY = [System.Net.NetworkCredential]::new('', $secureKey).Password
Invoke-RestMethod -Uri 'https://taodock.com/v1/models' -Headers @{
    Authorization = "Bearer $env:TAODOCK_API_KEY"
}
```

## 5. 发起一次对话 {#chat}

在同一个 macOS / Linux 终端继续运行：

```bash
curl --fail-with-body --silent --show-error https://taodock.com/v1/chat/completions \
  -H "Authorization: Bearer $TAODOCK_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "gpt-6.1-sol",
    "messages": [
      { "role": "user", "content": "你好，请用一句话介绍你自己。" }
    ]
  }'
```

PowerShell 在读取密钥后使用：

```powershell
$body = @{
    model = 'gpt-6.1-sol'
    messages = @(@{ role = 'user'; content = '你好，请用一句话介绍你自己。' })
} | ConvertTo-Json -Depth 5
$response = Invoke-RestMethod -Method Post -Uri 'https://taodock.com/v1/chat/completions' `
    -Headers @{ Authorization = "Bearer $env:TAODOCK_API_KEY" } `
    -ContentType 'application/json' -Body ([System.Text.Encoding]::UTF8.GetBytes($body))
$response.choices[0].message.content
```

普通文字对话的回复位于 `choices[0].message.content`。生成请求会消耗额度，金额以 TaoDock 的实际结算记录为准。

## 6. 查看记录并连接应用 {#next}

在[普通日志](https://taodock.com/usage-logs/common)核对刚才的模型、时间、状态和费用。收到回复且能找到对应记录后，便可继续[连接 AI 客户端](./guide/clients.md)或[接入自己的程序](./api/overview.md)。

如果调用失败，保留错误响应并按[排查顺序](./faq.md#troubleshoot)检查，不要反复发送相同的失败请求。
