# Taodock 手册站维护指南

这是使用 VitePress 1.6.4 默认主题搭建的独立文档站。依赖和 Bun 锁文件独立于 `web/`；本文件通过 `srcExclude` 排除，不会出现在生成的网站中。

## 本地运行

在终端执行：

```sh
cd /Users/leekinyeung/GolandProjects/itmazai-token/handbook
bun install --frozen-lockfile
bun run dev
```

打开终端显示的 Local 地址，通常为 `http://127.0.0.1:5173/`。编辑 Markdown 后浏览器会自动更新。使用 `Ctrl+C` 停止服务。

## 修改内容与导航

| 文件 | 作用 |
| --- | --- |
| `index.md` | 手册首页 |
| `quick-start.md` | 新用户首次调用流程 |
| `guide/console.md` | 控制台使用 |
| `guide/clients.md` | 客户端通用配置 |
| `guide/models.md` | TaoDock 模型、接口与分组选择 |
| `guide/api-keys.md` | 密钥的创建、限制与停用 |
| `guide/wallet.md` | 钱包、额度与用量核对 |
| `api/overview.md` | API 地址与基本调用说明 |
| `faq.md` | 常见问题 |
| `en/` | 与中文文章路径一一对应的英文手册 |
| `.vitepress/config.mjs` | 语言、站点名称、主站链接、导航、侧栏与搜索 |

新增一篇文章时，先创建 Markdown 文件，例如 `guide/models.md`，再在配置文件的 `themeConfig.sidebar` 对应分组中加入：

```js
{ text: '选择模型', link: '/guide/models' }
```

文章之间使用相对 Markdown 链接，例如 `[选择模型](./models.md)`。需要截图时，创建 `public/images/` 并加入已脱敏的图片，在 Markdown 中使用 `![截图说明](/images/文件名.png)`。

## 多语言维护

手册使用 VitePress 原生国际化，中文为默认语言，保留根路径；英文使用 `/en/`。导航中的语言菜单可以在同一篇文章的中英文版本间切换，搜索结果按当前语言分别索引。

| 中文源文件 | 英文译文 |
| --- | --- |
| `index.md` | `en/index.md` |
| `quick-start.md` | `en/quick-start.md` |
| `guide/console.md` | `en/guide/console.md` |
| `guide/clients.md` | `en/guide/clients.md` |
| `guide/models.md` | `en/guide/models.md` |
| `guide/api-keys.md` | `en/guide/api-keys.md` |
| `guide/wallet.md` | `en/guide/wallet.md` |
| `api/overview.md` | `en/api/overview.md` |
| `faq.md` | `en/faq.md` |

新增文章时同步创建对应译文，并分别更新顶层 `themeConfig.sidebar` 和 `locales.en.themeConfig.sidebar`。英文导航和首页链接必须带 `/en/`；文章内优先使用相对链接，让读者继续浏览当前语言。

文章正文需要分别编写，开启国际化不会自动翻译内容。需要跨语言保持章节定位时，在两种语言的对应标题上设置相同的显式锚点，例如 `## 标题 {#shared-section}`。

增加其他语言时，在 `.vitepress/config.mjs` 的 `locales` 中添加语言标签、合法的 HTML `lang`、标题、描述和完整的主题文案，并创建相应目录下的全部文章。保持所有语言的文章路径一致，避免语言切换后出现不存在的页面；在 `themeConfig.search.options.locales` 中加入该语言的搜索界面翻译。手册的多语言配置独立于主站的 i18next。

## 构建与预览

```sh
bun run build
bun run preview
```

生产文件生成到 `.vitepress/dist/`，预览地址以终端输出为准。构建会检查文章中的内部链接，请修复错误后再发布。

## 发布到静态托管

将静态托管服务的项目根目录设置为 `handbook`，然后填写：

- 安装命令：`bun install --frozen-lockfile`
- 构建命令：`bun run build`
- 输出目录：`.vitepress/dist`
- 构建环境：Node.js 22、Bun 1.4.3（本地验证环境）

将已构建的 `.vitepress/dist/` 整个目录交给现有 Nginx 等静态服务器也可以，无需启动 Go 服务或在生产环境运行开发服务器。

当前配置按独立域名根路径发布，保留默认 `.html` 地址。目标域名为 `docs.taodock.com`，具体首次部署步骤见下文。若发布在 `/help/` 等子路径，先在 `.vitepress/config.mjs` 顶层增加 `base: '/help/'`，重新构建。

Nginx 静态站的关键配置示例（根目录需要替换为实际上传目录；HTTPS 使用服务器已有的证书配置）：

```nginx
root /var/www/taodock-handbook;
index index.html;
error_page 404 /404.html;

location / {
    try_files $uri $uri.html $uri/ =404;
}
```

## 首次部署到 docs.taodock.com

采用现有服务器 `65.99.193.8` 的宿主机 Nginx 托管静态文件。文档使用独立的站点配置与发布目录，无需更新主站应用容器。下面的远程命令是首次部署流程；再次更新文章时使用本节末尾的更新说明，保留已生效的 HTTPS 配置。

### 1. 添加 DNS 记录

在 `taodock.com` 的 DNS 管理中新增记录：

| 字段 | 值 |
| --- | --- |
| 类型 | A |
| 名称 | docs |
| 值 | 65.99.193.8 |
| TTL | 默认值 |

当前域名使用 GoDaddy 的权威 DNS。保存后，在本机执行 `dig +short docs.taodock.com A`，确认返回服务器 IP，再继续申请证书。

### 2. 构建和打包（本机）

在 `handbook/` 中执行：

```sh
bun install --frozen-lockfile
bun run build
docs_package_dir=$(mktemp -d /private/tmp/taodock-handbook-package.XXXXXX)
mkdir "$docs_package_dir/site"
cp -R .vitepress/dist/. "$docs_package_dir/site/"
cp -R deploy "$docs_package_dir/deploy"
tar -czf /private/tmp/taodock-handbook-deploy.tar.gz -C "$docs_package_dir" site deploy
shasum -a 256 /private/tmp/taodock-handbook-deploy.tar.gz
scp /private/tmp/taodock-handbook-deploy.tar.gz root@65.99.193.8:/tmp/taodock-handbook-deploy.tar.gz
```

使用现有 SSH 认证即可；不需要传输私钥或在服务器安装 Bun。发布包的 `site/` 为公开网页，`deploy/` 为 Nginx 配置，站点根目录仅指向 `site/`。

### 3. 安装 HTTP 站点（服务器）

执行 `ssh root@65.99.193.8` 登录，以下命令均在同一个 Bash 会话中执行。先核对远程 `sha256sum` 与本机的结果一致。

```sh
set -euo pipefail
sha256sum /tmp/taodock-handbook-deploy.tar.gz
```

确认校验值一致后再执行：

```sh
test ! -e /etc/nginx/conf.d/docs.taodock.com.conf
test ! -e /var/www/taodock-handbook/current
docs_release=$(date -u +%Y%m%dT%H%M%SZ)
docs_release_dir=/var/www/taodock-handbook/releases/$docs_release
docs_backup_dir=/root/taodock-docs-backups/$docs_release
install -d -m 700 "$docs_backup_dir"
cp -a /etc/nginx "$docs_backup_dir/nginx"
install -d -m 755 "$docs_release_dir"
tar --no-same-owner -xzf /tmp/taodock-handbook-deploy.tar.gz -C "$docs_release_dir"
chmod -R a+rX "$docs_release_dir"
ln -s "$docs_release_dir/site" /var/www/taodock-handbook/current
install -d -m 755 /var/www/letsencrypt/.well-known/acme-challenge
install -m 644 "$docs_release_dir/deploy/docs.http.conf" /etc/nginx/conf.d/docs.taodock.com.conf
if ! nginx -t; then
    mv /etc/nginx/conf.d/docs.taodock.com.conf "$docs_backup_dir/docs.invalid.conf"
    exit 1
fi
systemctl reload nginx
curl --fail --silent --show-error --resolve docs.taodock.com:80:127.0.0.1 http://docs.taodock.com/ -o /dev/null
```

`test` 用于阻止首次部署命令覆盖已有文档站；失败时先检查现有部署状态。`nginx -t` 失败不会重载线上配置。

### 4. 申请证书并启用 HTTPS（服务器）

现有 Certbot 提供 `webroot` 插件。以下方式沿用 Nginx 的验证目录申请独立证书，不要求安装 Certbot 的 Nginx 插件。DNS 必须已经指向此服务器，且公网能够访问 80 端口。

```sh
certbot certonly --webroot \
    --webroot-path /var/www/letsencrypt \
    --cert-name docs.taodock.com \
    -d docs.taodock.com \
    --deploy-hook 'nginx -t && systemctl reload nginx'
```

沿用服务器已有的 ACME 账号；如 Certbot 提示需要操作，按终端提示完成。成功获得证书后再执行：

```sh
cp -a /etc/nginx/conf.d/docs.taodock.com.conf "$docs_backup_dir/docs.http.conf"
install -m 644 "$docs_release_dir/deploy/docs.https.conf" /etc/nginx/conf.d/docs.taodock.com.conf
if ! nginx -t; then
    cp -a "$docs_backup_dir/docs.http.conf" /etc/nginx/conf.d/docs.taodock.com.conf
    exit 1
fi
systemctl reload nginx
certbot renew --cert-name docs.taodock.com --dry-run --no-random-sleep-on-renew
systemctl is-enabled certbot.timer
```

保留 HTTP 验证路径以供续期使用。证书续期成功后，保存的 deploy hook 会检查并重载 Nginx。自动续期定时器应显示 `enabled`。

### 5. 验证与接入

在本机执行：

```sh
curl -I http://docs.taodock.com/
curl --fail -I https://docs.taodock.com/
curl --fail -I https://docs.taodock.com/en/
curl --fail -I https://docs.taodock.com/quick-start.html
curl --fail -I https://taodock.com/
```

确认文档 HTTP 跳转到 HTTPS、中英文页面与主站均正常，再在浏览器验证语言切换和搜索。随后按下节将主站「文档链接」改为 `https://docs.taodock.com`。

### 更新文章与回退

后续更新沿用第 2 步构建上传，将发布包解压到一个新的 `releases/<时间戳>/` 目录。记录 `readlink /var/www/taodock-handbook/current` 的旧目标，再创建指向新 `site/` 的 `current.next` 符号链接，使用 `mv -Tf` 原子替换 `current`。保留旧发布目录；回退时同样将链接切回旧目标。静态文件更新不需要重载 Nginx，也不要重新安装 HTTP 配置或重新申请证书。

首次部署需要停用文档站时，只将 `/etc/nginx/conf.d/docs.taodock.com.conf` 移到本次备份目录，确认 `nginx -t` 成功再重载。保留证书、发布目录及 `/etc/nginx/conf.d/taodock.com.conf`。

### 2026-10-23 首次上线记录

- 中文入口：`https://docs.taodock.com/`；英文入口：`https://docs.taodock.com/en/`。
- 发布版本：`20261023T062617Z`（本地手册工作区构建，未对应 Git 提交）。
- 静态发布目录：`/var/www/taodock-handbook/releases/20261023T062617Z/site`。
- 当前站点链接：`/var/www/taodock-handbook/current`。
- Nginx 配置：`/etc/nginx/conf.d/docs.taodock.com.conf`。
- Nginx 备份：`/root/taodock-docs-backups/20261023T062617Z/nginx`。
- 发布包 SHA-256：`4722f5e17904cd05bbf2dd38c50db8bd2ab9c0036dcae20095bbad0f4b6af616`，服务器安装前已核对。
- 运行版本：VitePress 1.6.4、Nginx 1.24.0（Ubuntu）、Certbot 2.9.0。
- 证书：`/etc/letsencrypt/live/docs.taodock.com/`，有效期至 2027-01-21；续期使用现有 `certbot.timer`，成功后检查并重载 Nginx。
- 实测：`bun run build` 成功；服务器 `nginx -t` 成功；中英文首页和快速开始页的 HTTPS 内容逐字节匹配构建；HTTP 返回 301 并跳转到 HTTPS；不存在的页面和部署配置地址返回 404；主站 `/api/status` 返回成功。
- 续期验证：`certbot renew --cert-name docs.taodock.com --dry-run --non-interactive --no-random-sleep-on-renew` 成功。
- 主站配置校验：`sha256sum --check /root/taodock-docs-backups/20261023T062617Z/main-nginx.sha256` 成功，应用镜像 ID 与部署前相同。
- 验证限制：线上自动浏览器预览未响应；语言切换和搜索此前已在本地生产预览中验证。
- 主站入口：首次上线时仍为上游地址；2026-10-26 复核 `/api/status`，已指向 `https://docs.taodock.com`。

如需停用这次新建的文档站，在服务器执行以下命令保留配置副本，并在语法检查通过后重载：

```sh
sudo bash -euc '
test -f /etc/nginx/conf.d/docs.taodock.com.conf
test ! -e /root/taodock-docs-backups/20261023T062617Z/docs.disabled.conf
mv /etc/nginx/conf.d/docs.taodock.com.conf /root/taodock-docs-backups/20261023T062617Z/docs.disabled.conf
nginx -t
systemctl reload nginx
'
```

### 2026-10-26 专属手册更新记录

- 发布版本：`20261026T061954Z`，来自本次手册工作区；中英文各九页。
- 内容：统一使用 TaoDock 实际域名、入口和已核对模型 ID；新增模型、API 密钥、钱包指南，完善客户端配置、终端和程序调用、排错步骤。
- 发布目录：`/var/www/taodock-handbook/releases/20261026T061954Z/site`。
- 上一版：`/var/www/taodock-handbook/releases/20261023T062617Z/site`，保留以便回退。
- 本次备份：`/root/taodock-docs-backups/20261026T061954Z`，其中 `previous-target` 保存旧站点目标，`nginx.sha256` 保存部署前配置校验值。
- 发布包 SHA-256：`1d8311c161da47db0a49209c4e3451d2a534e7615f78f825ce1682267c7a3872`，服务器安装前已核对。
- 更新方式：校验后解压至新目录，保留旧版本静态资源以兼容已打开的页面，原子替换 `current` 链接；未修改 Nginx、证书或主站应用。
- 实测：`bun run build` 成功；中英文文章路径对齐、内部路径与锚点、公开文案占位内容扫描均通过；Python / JavaScript 代码以模拟响应校验请求地址、认证头、模型和输出；Bash / Zsh 语法检查通过。没有使用真实密钥进行计费调用，PowerShell 代码未在 Windows 环境执行。
- 线上：18 个页面通过 HTTPS 获取，并逐字节匹配本次构建；主站 `/api/status` 返回成功，文档入口正确；Nginx 配置校验值和主站镜像 ID 与本次部署前一致。
- 验证限制：自动浏览器仍未响应，未完成本次浏览器交互复验。

回退本次静态内容时，在服务器执行以下命令；无需修改 Nginx 配置或重载服务：

```sh
sudo bash -euc '
docs_previous=$(cat /root/taodock-docs-backups/20261026T061954Z/previous-target)
test -s "$docs_previous/index.html"
test -L /var/www/taodock-handbook/current
test ! -e /var/www/taodock-handbook/current.rollback.20261026T061954Z
ln -s "$docs_previous" /var/www/taodock-handbook/current.rollback.20261026T061954Z
mv -Tf /var/www/taodock-handbook/current.rollback.20261026T061954Z /var/www/taodock-handbook/current
'
```

### 2026-10-26 地址填写说明修正

- 发布版本：`20261026T064941Z`；发布包 SHA-256：`2f5af27436d2e04ce0145b2e4b729d6c34cc4b1b65650ea3aa7044057801fe0e`，上传后已核对。
- 明确地址由客户端追加的路径决定：追加 `/chat/completions` 时填写带 `/v1` 的地址；追加 `/v1/chat/completions` 时填写站点根地址。中英文客户端指南、FAQ、API 说明和密钥指南保持一致。
- 本次备份：`/root/taodock-docs-backups/20261026T064941Z`；旧站点目标保存在其中的 `previous-target`，上一版为 `20261026T061954Z`。
- 验证：`bun run build`、内容与链接检查通过；八个修改页面的线上内容逐字节匹配构建；主站状态正常，Nginx 配置和应用镜像未改动。
- 回退方式与上一节一致，使用本次备份中的 `previous-target` 原子切换 `current` 链接。

## 接入主站

确认线上文档可访问后，使用管理员账号进入主站：

1. 在「系统设置 → 站点设置 → 系统信息」的「文档链接」填写文档站的 HTTPS 地址并保存。
2. 在同一站点设置的「顶部导航」中开启文档入口并保存。
3. 通过主站导航打开文档，检查手机访问、搜索和文章链接。

## 发布内容前

公开手册使用 TaoDock 的实际域名、控制台路径和已核对的模型 ID。维护时同步更新中英文对应文章，不得重新引入占位域名、虚构密钥或未经核对的模型名称。密钥由用户自己输入，不能将测试凭据写入公开页面。

2026-10-26 内容核对来源为主站 `/api/status`、`/api/pricing`、`/api/about` 的公开信息及当前前端路由与密钥操作实现。注册要求、模型可用性和价格可能变化，每次修改相关内容时重新核对；客户端配置另外参考 Cherry Studio 和 Open WebUI 的官方说明。未使用真实密钥发起计费生成调用。

## 官方参考

- [VitePress 1.x 开始使用](https://vuejs.github.io/vitepress/v1/guide/getting-started)
- [VitePress 1.x 本地搜索](https://vuejs.github.io/vitepress/v1/reference/default-theme-search)
- [VitePress 1.x 国际化](https://vuejs.github.io/vitepress/v1/guide/i18n)
- [VitePress 1.x 部署指南](https://vuejs.github.io/vitepress/v1/guide/deploy)
