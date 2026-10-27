# API 接入说明

TaoDock 的 API 服务地址是 **https://taodock.com**，OpenAI 兼容 Base URL 为 **`https://taodock.com/v1`**。以下代码已使用 TaoDock 的真实地址，密钥从你自己的终端或环境变量读取。

## 地址与接口 {#endpoints}

| 用途 | 方法 | 地址 |
| --- | --- | --- |
| 控制台 | 浏览器访问 | `https://taodock.com` |
| OpenAI 兼容 Base URL | 配置到客户端或程序 | `https://taodock.com/v1` |
| 查询当前密钥可用模型 | GET | `https://taodock.com/v1/models` |
| 文字对话 | POST | `https://taodock.com/v1/chat/completions` |
| Anthropic Messages | POST | `https://taodock.com/v1/messages` |
| 图片生成 | POST | `https://taodock.com/v1/images/generations` |

本表中的 Base URL 是程序使用的基础地址；客户端若会自行补齐 `/v1`，其地址框应填写 `https://taodock.com`。请按[客户端的路径拼接规则](../guide/clients.md#settings)选择，不能只根据字段名称判断。

后三类生成接口需选择支持对应协议的模型。当前公开目录列出的协议可在[模型选择](../guide/models.md#protocol)中查看。不要把文档站 `docs.taodock.com` 配置为 API 服务地址。

## 准备密钥 {#credentials}

先在 [TaoDock API 密钥](https://taodock.com/keys)创建密钥。cURL 和 JavaScript 代码使用 `TAODOCK_API_KEY` 环境变量；在 Bash / Zsh 中按下面的方式读取，避免将密钥直接写进脚本。

```bash
printf '请输入 TaoDock API 密钥：'
read -r -s TAODOCK_API_KEY
printf '\n'
export TAODOCK_API_KEY
```

请求头使用 `Authorization: Bearer` 携带密钥。程序在你自己的服务端运行，不要把密钥打包进浏览器页面。

## cURL 查询与对话 {#curl}

查询可用模型：

```bash
curl --fail-with-body --silent --show-error https://taodock.com/v1/models \
  -H "Authorization: Bearer $TAODOCK_API_KEY"
```

发送普通文字对话：

```bash
curl --fail-with-body --silent --show-error https://taodock.com/v1/chat/completions \
  -H "Authorization: Bearer $TAODOCK_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"model":"gpt-6.1-sol","messages":[{"role":"user","content":"请简要介绍 TaoDock 的 API 接入方式。"}]}'
```

## Python {#python}

保存为 `taodock_chat.py`，使用 `python3 taodock_chat.py` 运行。仅使用 Python 标准库；未设置环境变量时会提示输入密钥。

```python
import getpass
import json
import os
import urllib.error
import urllib.request

api_key = os.environ.get("TAODOCK_API_KEY") or getpass.getpass("TaoDock API Key: ")
payload = {
    "model": "gpt-6.1-sol",
    "messages": [{"role": "user", "content": "你好，请用一句话介绍你自己。"}],
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

先按上文读取环境变量，将代码保存为 `taodock-chat.mjs`，使用 Node.js 22 或更高版本执行 `node taodock-chat.mjs`。使用运行时自带的 `fetch`，无需安装依赖。

```javascript
const apiKey = process.env.TAODOCK_API_KEY
if (!apiKey) throw new Error('请先设置 TAODOCK_API_KEY 环境变量')

const response = await fetch('https://taodock.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-6.1-sol',
    messages: [{ role: 'user', content: '你好，请用一句话介绍你自己。' }],
  }),
  signal: AbortSignal.timeout(90000),
})
if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`)
const result = await response.json()
console.log(result.choices[0].message.content)
```

## 流式对话 {#streaming}

需要逐段显示回复时，将 `stream` 设为 `true`。命令中的 `-N` 让 cURL 及时显示接收到的数据。

```bash
curl --fail-with-body --silent --show-error -N https://taodock.com/v1/chat/completions \
  -H "Authorization: Bearer $TAODOCK_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"model":"gpt-6.1-sol","messages":[{"role":"user","content":"请用三句话介绍你自己。"}],"stream":true}'
```

流式响应按 SSE 的 `data:` 事件读取，文字增量通常位于 `choices[0].delta.content`；不要把整段响应当作单个 JSON 文档解析。客户端超时后重试前，先核对[使用日志](https://taodock.com/usage-logs/common)是否已经执行该请求。

## 错误排查 {#errors}

保留 HTTP 状态码和响应中的错误说明，优先按[常见问题](../faq.md#troubleshoot)检查。代码中指定的 `gpt-6.1-sol` 必须在该密钥的可用模型列表中；需要更换时，从 `/v1/models` 返回的 `id` 完整复制。
