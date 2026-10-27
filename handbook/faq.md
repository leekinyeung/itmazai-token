# 常见问题

## 按什么顺序排查接入失败？ {#troubleshoot}

1. 检查客户端的地址拼接规则，确认最终文字对话请求地址为 `https://taodock.com/v1/chat/completions`。
2. 检查 API 密钥是否来自 [TaoDock 密钥页面](https://taodock.com/keys)，并且已启用、未过期。
3. 查询 `https://taodock.com/v1/models`，确认使用的模型 ID 和密钥权限。
4. 检查[钱包余额](https://taodock.com/wallet)及密钥剩余额度。
5. 在[普通日志](https://taodock.com/usage-logs/common)按时间与模型查找记录，保留具体错误说明。

## 注册邮箱收不到验证码 {#email}

TaoDock 当前使用邮箱验证注册。先核对邮箱拼写，再检查垃圾邮件和邮件过滤规则。发送按钮有倒计时时，等待后再重试；始终收不到时，记录发生时间和页面错误信息，通过 TaoDock 页面提供的支持渠道反馈。

不要将邮箱验证码发送给他人，也不要把验证码作为客户端 API Key。

## 客户端的地址到底填哪个？ {#address}

| 请求路径如何补齐 | 填写内容 |
| --- | --- |
| 客户端自动追加 `/chat/completions` | `https://taodock.com/v1` |
| 客户端自动追加 `/v1/chat/completions` | `https://taodock.com` |
| cURL 直接请求文字对话 | `https://taodock.com/v1/chat/completions` |

前两行对应不同客户端，只需选择与自己的客户端匹配的一行；最终接口地址相同。不能只看字段叫「Base URL」还是「Host」来决定是否填写 `/v1`。

文档地址 `https://docs.taodock.com` 用于查阅手册。返回 HTML 网页、404，或路径中出现 `/v1/v1` 时，优先修正地址。具体客户端见[接入指南](./guide/clients.md)。

## 401、密钥无效或没有权限 {#credentials}

完整复制 TaoDock API 密钥，去掉粘贴时带入的空格、换行和引号。确认没有把登录密码或其他平台的密钥填到 API Key 中，并检查密钥启用状态、有效期、IP 和模型限制。

程序请求使用 `Authorization: Bearer` 请求头，不要把密钥放在公开 URL 中。

## 模型不存在或没有可用渠道 {#model}

从[模型广场](https://taodock.com/pricing)或 `/v1/models` 重新复制完整模型 ID，核对协议与密钥分组。不要自行替换模型名中的点号、连字符或供应商前缀。

如果模型和权限均正确，但持续提示没有可用渠道，记录模型、发生时间和请求标识反馈；重复修改客户端的模型名称通常不能解决服务侧可用性问题。

## 账户有余额，仍提示额度不足 {#quota}

钱包余额与密钥额度是两项独立限制。检查[钱包](https://taodock.com/wallet)的可用额度，再检查[密钥](https://taodock.com/keys)的剩余额度、限制和有效期；使用套餐时同时确认套餐是否有效。

密钥「不限制额度」不等于免费或无限使用，详见[钱包与用量](./guide/wallet.md)。

## 429 或请求过多 {#rate-limit}

降低并发请求数。如果响应提供重试时间，按该时间等待；程序使用逐步延长间隔的退避方式重试，不要不断立即重发。持续受限时保留错误响应和发生时间。

## 连接超时、502 或 503 {#connection}

检查网络和客户端代理设置，用同一密钥、同一模型进行一次简单请求对照。再到[使用日志](https://taodock.com/usage-logs/common)确认请求是否已执行。

不要通过关闭 HTTPS 证书校验来解决连接问题；先核对域名、系统时间与网络代理。如果多种应用都无法使用同一模型，应把错误信息反馈给 TaoDock。

## 网页体验正常，但客户端不能用 {#client}

网页体验使用账号权限；客户端还受到当前 API 密钥的分组、模型、IP 和额度限制。确认两处选择的是相同模型，并按[客户端接入](./guide/clients.md#settings)重新核对配置。

## 显示任务已提交，但还没有结果 {#tasks}

到[任务日志](https://taodock.com/usage-logs/task)查看任务状态和任务 ID。已提交不等于已完成；按任务状态继续查询，避免在等待期间重复创建同一任务。

## 如何反馈问题？ {#support}

提供发生时间与时区、客户端名称与版本、模型 ID、HTTP 状态码、错误响应和可获得的请求或任务标识。涉及到账问题时增加订单号和金额。

先移除完整 API 密钥、密码、验证码和私人对话内容，再通过 TaoDock 页面中实际提供的联系渠道反馈。TaoDock 的[关于页面](https://taodock.com/about)可用于核对平台信息。
