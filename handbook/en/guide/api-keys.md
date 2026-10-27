# API key management

[API Keys](https://taodock.com/keys) authorize applications to access TaoDock. Your password signs you into the console; your API key connects clients and programs. They are not interchangeable.

## Create and name a key {#create}

1. Sign in and open [API Keys](https://taodock.com/keys).
2. Select **Create API Key** and use a recognizable application name such as `Cherry Studio` or `Personal script`.
3. Select an available group, then set quota, expiration, and access restrictions as needed.
4. Save, copy the key from the list, and enter it in your application's API Key field.

Separate keys make it easier to find requests or disable one application without affecting others.

## Quota, expiration, and restrictions {#restrictions}

| Setting | Meaning and guidance |
| --- | --- |
| Group | Selects the model service access for the key; choose from the options offered |
| Key quota | Limits consumption by this key without adding account balance |
| Unlimited quota | Removes this key's own quota cap; account balance and other account rules still apply |
| Expiration | Requests stop working after expiry; set an appropriate date for temporary use |
| Model restrictions | Permits only selected models; check these when adding models to a client |
| IP restrictions | Limits source IP addresses; use for fixed outbound addresses, and leave unset if the address is uncertain |

Mobile, home, and proxy IP addresses can change. If access stops after setting an IP restriction, check the actual outbound address before creating more keys.

## Copy the address and connect applications {#connect}

The **API Addresses** action at the top of the page shows the TaoDock entry point: `https://taodock.com`. Whether to add `/v1` in a client's address field depends on the path it appends. See [client connection settings](./clients.md#settings).

Key row actions include copying, editing, and client connections. The **Chat** submenu offers configured clients; install the client first and follow the [import guide](./clients.md#import).

## Disable, delete, or replace a leaked key {#revoke}

Disable a key when its application is no longer used. Before reconnecting, check that the key is enabled and has not expired.

If a key was exposed in a public repository, shared link, or untrusted location, disable the old key, create a replacement, and update the application. Before deleting a key, confirm that all applications using it have been updated.

Remove complete keys from shared errors. Keep usable keys out of browser frontend bundles, public configuration files, and screenshots.
