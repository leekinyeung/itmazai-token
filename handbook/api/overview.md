# API 接入说明

本页介绍 OpenAI 兼容接口的基本地址约定。实际可用接口和模型能力取决于站点配置。

## 区分三种地址

| 名称 | 占位示例 | 用途 |
| --- | --- | --- |
| 站点地址 | `https://your-site.example` | 打开控制台，或由客户端自动拼接接口路径 |
| Base URL | `https://your-site.example/v1` | 配置要求填写 OpenAI 兼容基础地址的 SDK 或客户端 |
| 完整接口地址 | `https://your-site.example/v1/chat/completions` | 直接发起 HTTP 对话请求 |

`your-site.example` 仅为示例域名，使用时需要替换。文档网站与 API 服务可以部署在不同域名下，请以服务站点给出的 API 地址为准。

## 请求认证

在服务端请求中携带你的 API 密钥：

```http
Authorization: Bearer YOUR_API_KEY
```

## 查询可用模型

```sh
curl 'https://your-site.example/v1/models' \
  -H 'Authorization: Bearer YOUR_API_KEY'
```

查询结果受账号、密钥权限和站点配置影响。进行对话调用时，还应确认所选模型支持对话接口。

## 发送对话请求

参照[完成第一次调用](../quick-start.md)中的示例。请求体中的 `model` 使用完整模型 ID，`messages` 使用对话消息列表。

## 处理错误

保留 HTTP 状态码及响应中的错误说明，再结合[常见问题](../faq.md)定位原因。向管理员反馈时提供发生时间、模型名称和请求标识，不要提供完整密钥。
