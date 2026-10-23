# FAQ

## Which API address should I use?

Use the API address from your service site. The documentation domain does not provide model APIs. Clients usually require either the site URL or a base URL ending in `/v1`, depending on whether they append the path automatically. See the [URL guide](./api/overview.md).

## My API key is invalid or access is denied

Check that the key was copied in full, is active, has not expired, and permits the model and access method you are using. For direct HTTP requests, check that the header is `Authorization: Bearer YOUR_API_KEY`.

## The model does not exist or is unavailable

Copy the full model ID again from Model Square and check that both your account and API key can use it. If the name and permissions are correct, ask your administrator to check the model service status.

## I do not have enough quota

Check your available wallet balance, plan status, and API key quota limit. Refer to the error response and site pages for the specific restriction.

## I am being rate limited

Reduce the number of concurrent requests and retry later according to the response instructions. If requests remain limited, give your administrator the time and error message.

## Requests time out or cannot connect

Check the domain, network connection, and client proxy settings, then try a simple request with the same model. If the issue persists, provide the time, model name, and error message to your administrator.

## How do I report a problem?

Include the time, client name and version, model name, steps to reproduce, HTTP status code, and full error message. Include a request ID if one is displayed. Before sharing, remove API keys, personal information, and private conversation content.
