# Using the console

[Sign in to TaoDock](https://taodock.com/sign-in) to access the pages below. For a first integration, follow **Wallet → API Keys → Model Square → client setup → usage logs**.

## Main pages {#navigation}

| Page | Open directly | Purpose |
| --- | --- | --- |
| Overview | [Console overview](https://taodock.com/dashboard/overview) | Account information and recent usage |
| Model Square | [Browse models](https://taodock.com/pricing) | Model IDs, protocols, groups, and pricing |
| API Keys | [Manage keys](https://taodock.com/keys) | Create, copy, restrict, disable, and connect keys |
| Wallet | [Open Wallet](https://taodock.com/wallet) | Quota, funding or redemption options, and account records |
| Playground | [Open Playground](https://taodock.com/playground) | Try model conversations in the browser |
| Common Logs | [View request logs](https://taodock.com/usage-logs/common) | API requests, usage, and charges |
| Task Logs | [View task logs](https://taodock.com/usage-logs/task) | Task request status and results |
| Profile | [Open Profile](https://taodock.com/profile) | Personal information and preferences |
| Security & Access | [Open security settings](https://taodock.com/security) | Available security settings and session management |

Protected pages require sign-in. Regular users do not need administrative pages such as Channels, Task Plugins, or System Settings to call models.

## Try a model in Playground {#playground}

Open [Playground](https://taodock.com/playground), select an accessible model, and send a short question. Use the same model in your client afterward to distinguish model access issues from client configuration issues.

Playground generation requests also consume model quota; it is not a free testing tool.

## Find an API request {#logs}

1. Open [Common Logs](https://taodock.com/usage-logs/common).
2. Set the time range around the request.
3. Locate it using the model, key name, and result.
4. Open details to check usage, charges, errors, and any request identifier shown.

For task requests, also check [Task Logs](https://taodock.com/usage-logs/task). Submission does not mean generation has completed; use the task status to find the final result.

## Next steps {#next}

- [Choose a model and protocol](./models.md)
- [Manage API keys](./api-keys.md)
- [Check wallet and usage](./wallet.md)
- [Connect an AI client](./clients.md)
