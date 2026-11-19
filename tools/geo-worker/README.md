# GEO Worker 与 TaoDock

`geo` 是可选的 Compose profile。启用后，TaoDock 和 GEO Worker 在同一个 Compose 项目中启动，Worker 通过专用 Docker 网络提供 `http://geo-worker:3031`。

## 准备镜像和渠道

在仓库根目录构建含有 GEO 截图代理的 TaoDock 镜像，并把下面两项写入同目录的 `.env`。如果服务器已有这个版本的 TaoDock 镜像，可直接使用该镜像。

```sh
docker build -t taodock:geo .
node -e 'console.log(require("node:crypto").randomBytes(32).toString("base64url"))'
```

```dotenv
TAODOCK_IMAGE=taodock:geo
GEO_WORKER_TOKEN=填入上一步生成的值
```

将 [plugin.js](plugin.js) 导入 TaoDock 的任务插件管理。在 TaoDock 新建或编辑该插件的渠道，选择 `geo`、模型 `geo-monitor`，将渠道地址设成 `http://geo-worker:3031`，渠道密钥填同一个 `GEO_WORKER_TOKEN`。截图下载沿用 TaoDock 的身份认证和任务权限检查。

## 首次登录 DeepSeek

在部署机器上执行以下命令。首次构建 Worker 时需要下载 Playwright 镜像和依赖。如果 Worker 已经启动，先停止它，登录容器和 Worker 使用同一个浏览器资料卷。

```sh
docker compose --profile geo build geo-worker
docker compose --profile geo stop geo-worker
docker compose --profile geo run --rm --no-deps -p 127.0.0.1:15900:5900 geo-worker login
```

运行 `openssl rand -base64 6` 生成一次性的 VNC 密码，填进登录命令的提示。如果部署机器是服务器，从自己的电脑另开终端建立 SSH 隧道。

```sh
ssh -N -L 15900:127.0.0.1:15900 <服务器>
```

用 VNC 客户端连接本机 `127.0.0.1:15900`，输入临时密码。在 Chromium 窗口手动登录 DeepSeek，确认可进入聊天页面，再回到运行登录命令的终端按回车。Chromium 会先保存浏览器资料并退出。

## 日常启动

```sh
docker compose --profile geo up -d
```

以后重启或重建 Worker 会复用 `deepseek_profile` 命名卷。登录过期时重复首次登录中的停止和登录步骤。保留该卷才能复用登录态，避免对这个 Compose 项目执行 `down -v`。

## 已部署的 TaoDock 服务器

**Deploy production** 会把同一提交构建成同一个镜像仓库里的两个 tag，例如 TaoDock 的 `sha-1a2b3c4d5e6f` 和 Worker 的 `geo-worker-sha-1a2b3c4d5e6f`。CI 会启动两项服务，验证模拟回答、引用和截图，再触发服务器部署。服务器沿用对该镜像仓库的拉取权限，并等待两项服务通过健康检查后记下发布版本。

首次发布前，在服务器应用目录的 `.env` 设置 `GEO_WORKER_TOKEN`，并在 TaoDock 的 `geo-monitor` 渠道配置相同密钥。自动部署会启用 Worker。容器重建时使用生产 Compose 项目 `itmazai-app` 的 `deepseek_profile` 卷。

首次手动登录或登录过期时，从服务器应用目录加载已部署的镜像信息，再使用上面的停止和登录命令。将 `docker compose` 替换成 `taodock_compose`，登录后执行最后一行恢复 Worker。

```sh
export APP_ENV_FILE="$PWD/.env"
export IMAGE_NAME=部署时使用的镜像名
export IMAGE_TAG="$(cat .state/current_tag)"
export GEO_WORKER_IMAGE="$(cat ".state/geo-worker/$IMAGE_TAG")"
taodock_compose() {
  docker compose --project-name itmazai-app --project-directory "$PWD" \
    --env-file "$APP_ENV_FILE" -f .deploy/docker-compose.app.yml "$@"
}
taodock_compose --profile geo up -d geo-worker
```

**Rollback production** 会一起恢复目标版本及其发布记录里的 Worker 镜像。回到 GEO Worker 接入前的版本时，部署只启动 TaoDock，登录卷会保留。通过 **Deploy production** 手动重发这类旧版本时，填写历史 tag 并勾选 `legacy_app_only`。
