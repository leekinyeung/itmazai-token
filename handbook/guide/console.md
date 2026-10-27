# 控制台使用

登录 [TaoDock](https://taodock.com/sign-in) 后，可通过以下入口完成日常操作。首次使用建议按「钱包 → API 密钥 → 模型广场 → 客户端接入 → 使用日志」的顺序操作。

## 常用入口 {#navigation}

| 页面 | 直接打开 | 用途 |
| --- | --- | --- |
| 概览 | [控制台概览](https://taodock.com/dashboard/overview) | 查看账户和近期使用情况 |
| 模型广场 | [查看模型](https://taodock.com/pricing) | 查询模型 ID、接口、分组和价格 |
| API 密钥 | [管理密钥](https://taodock.com/keys) | 创建、复制、限制、停用和接入客户端 |
| 钱包 | [查看钱包](https://taodock.com/wallet) | 查看额度、充值或兑换入口和账户记录 |
| 体验中心 | [打开体验中心](https://taodock.com/playground) | 在网页内尝试模型对话 |
| 普通日志 | [查看普通日志](https://taodock.com/usage-logs/common) | 核对 API 请求、用量和费用 |
| 任务日志 | [查看任务日志](https://taodock.com/usage-logs/task) | 查看任务型请求的状态和结果 |
| 个人资料 | [打开个人资料](https://taodock.com/profile) | 管理个人信息和偏好 |
| 安全与访问 | [打开安全设置](https://taodock.com/security) | 查看账号提供的安全设置和会话管理 |

未登录时，受保护页面会先要求登录。普通账号不需要进入渠道、任务插件或系统设置等管理页面来调用模型。

## 在体验中心测试 {#playground}

打开[体验中心](https://taodock.com/playground)，选择账号可用的模型，输入简短问题并发送。网页内成功后，再将相同模型接入客户端，更容易区分模型权限与客户端配置问题。

体验中心的生成请求同样会消耗模型额度，不能当作免费测试工具。

## 查找一次 API 请求 {#logs}

1. 打开[普通日志](https://taodock.com/usage-logs/common)。
2. 将时间范围调整到调用发生的时间附近。
3. 结合模型名称、密钥名称和请求结果查找记录。
4. 打开详情，核对用量、费用、错误说明和页面提供的请求标识。

任务型请求可在[任务日志](https://taodock.com/usage-logs/task)中继续查看。任务已提交不等于已经生成成功，应根据任务状态查看最终结果。

## 下一步 {#next}

- [选择模型和接口](./models.md)
- [管理 API 密钥](./api-keys.md)
- [查看钱包与用量](./wallet.md)
- [连接 AI 客户端](./clients.md)
