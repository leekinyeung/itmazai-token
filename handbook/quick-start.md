# 完成第一次调用

本页以 OpenAI 兼容的对话接口为例。准备一个可用账号、API 密钥和账号有权使用的对话模型。

## 1. 进入控制台

打开你正在使用的 Taodock 站点并登录；如果尚无账号，按站点提供的方式注册或联系管理员开通。

## 2. 选择模型并确认额度

进入「模型广场」查看模型名称和说明，再到「钱包」确认可用额度或套餐。模型名称需要完整复制，不能使用自己起的简称。

## 3. 创建 API 密钥

进入「API 密钥」页面，创建供当前应用使用的密钥，检查其有效期、额度和模型限制。请妥善保存密钥，不要放进截图、公开仓库或浏览器前端代码。

## 4. 发起一次对话

下面的地址和密钥都是占位示例。将域名替换为你的实际站点地址，将 `YOUR_MODEL_ID` 替换为可用的对话模型 ID，再填入你创建的密钥。

```sh
curl 'https://your-site.example/v1/chat/completions' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "YOUR_MODEL_ID",
    "messages": [
      { "role": "user", "content": "你好，请用一句话介绍你自己。" }
    ]
  }'
```

收到包含 `choices` 的正常对话响应后，进入「使用日志」查看本次请求记录。如果出错，先阅读响应中的错误信息，再查看[常见问题](./faq.md)。

## 下一步

- [连接 AI 客户端](./guide/clients.md)
- [了解接口地址和调用方式](./api/overview.md)
