# CI/CD 运行手册

面向 `itmazai-token`（new-api 网关）的生产发布流程。目标是：**合入 main 即自动发布，发布失败自动回滚，任何人不需要登录服务器手工操作**。

## 1. 改造前后对比

| 环节 | 改造前 | 改造后 |
| --- | --- | --- |
| 构建 | 本地 `make build-all-web` + `docker build` | GitHub Actions 构建，带 gha 层缓存 |
| 镜像 | 只在上游 `calciumion/new-api` 名下、仅打 tag 时构建 | 推到自己的 `ghcr.io/<owner>/itmazai-token`，每次 main 合入产出不可变 `sha-<12>` |
| 版本号 | 仓库 `VERSION` 是空文件，界面版本显示为空 | 构建时由 `git describe` 生成并写入镜像 |
| 上传 | 手工 scp / 手工 pull | CI 通过 SSH 同步部署文件并拉起容器 |
| 数据库备份 | 靠人记得 | 每次发布前自动 `pg_dump`，保留最近 7 份 |
| 上线验证 | 人工打开页面看 | 容器内 `/api/status` 健康检查 + 镜像层级的冒烟测试 |
| 失败处理 | 半夜手工回退 | 健康检查不通过自动切回上一版本，流水线报红 |
| 回滚 | 重新找旧包 | Actions 一键 `Rollback production` |

## 2. 流水线总览

```
PR opened/synchronize
  └─ CI（go vet/build/test × 3 模块 + 前端 typecheck/test）  ← .github/workflows/ci.yml

main 合入
  └─ Deploy production                                    ← .github/workflows/deploy.yml
       1. quality-gate  复用 ci.yml，PR 与发布跑同一套检查
       2. build         docker buildx 构建并推送 <image>:sha-<12>（provenance + SBOM）
       3. smoke         用 SQLite 起容器，验证 /api/status 与内嵌前端
       4. deploy        SSH 到服务器：pull → 备份库 → up → 健康检查（失败自动回滚）
       5. promote       部署成功后才把 latest 指向该 sha，保证 latest == 线上实际版本

线上异常
  └─ Rollback production                                  ← .github/workflows/rollback.yml
       指定 tag 或留空（回到服务器记录的上一版本）
```

新增文件：

| 文件 | 作用 |
| --- | --- |
| `.github/workflows/deploy.yml` | 生产发布主流水线 |
| `.github/workflows/rollback.yml` | 一键回滚 |
| `deploy/docker-compose.app.yml` | 应用栈（只含 new-api，部署只替换它） |
| `deploy/docker-compose.infra.yml` | 基础设施栈（Postgres + Redis，单独管理） |
| `deploy/deploy-remote.sh` | 服务器端：拉取/备份/启动/健康检查/自动回滚 |
| `deploy/bootstrap-server.sh` | 服务器一次性初始化（幂等） |
| `deploy/.env.example` | 生产环境变量模板 |

## 3. 一次性配置

### 3.1 GitHub 仓库设置

Settings → Secrets and variables → Actions。

镜像仓库用 **GitHub Container Registry（ghcr.io）**，登录凭据是 Actions 自动注入的 `GITHUB_TOKEN`，**不需要配置任何 registry 密钥**。

**Secrets**

| 名称 | 说明 |
| --- | --- |
| `SSH_PRIVATE_KEY` | 部署用私钥全文（含 `-----BEGIN...`） |
| `SSH_KNOWN_HOSTS` | 可选但强烈建议：`ssh-keyscan -p 22 <host>` 的输出，用于固定主机指纹 |

**Variables**

| 名称 | 示例 | 说明 |
| --- | --- | --- |
| `SSH_HOST` | `1.2.3.4` | 服务器地址（也可放同名的 Secret） |
| `SSH_USER` | `deploy` | 部署账号（也可放 Secret） |
| `SSH_PORT` | `22` | SSH 端口 |
| `DEPLOY_PATH` | `/root/new-api` | 服务器部署目录（本仓库当前接管的是旧栈目录） |
| `IMAGE_NAME` | `ghcr.io/leekinyeung/itmazai-token` | 可选，默认 `ghcr.io/<owner>/itmazai-token` |
| `REGISTRY` | `ghcr.io` | 可选，换仓库时才需要 |
| `PRODUCTION_URL` | `https://your-domain` | 可选，显示在部署记录里 |

生成部署密钥并授权：

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ./deploy_key -N ""
# 公钥追加到服务器的部署账号
ssh-copy-id -i deploy_key.pub deploy@<host>
# 私钥整段贴进 SSH_PRIVATE_KEY
cat deploy_key
```

以上步骤也可以一条命令走完（推荐，敏感值不回显、不落盘）：

```bash
bash deploy/setup-secrets.sh            # 自动识别当前仓库，逐个提示输入
# 等价于手工在网页上填：Settings → Secrets and variables → Actions
```

脚本会用 `gh` 写入 `SSH_HOST`、`SSH_USER`、`SSH_PORT`、`DEPLOY_PATH` 四个 Variable，最后打印待执行的 `ssh-copy-id` 命令。镜像仓库不需要密钥，所以脚本不再收集 token。

首次推送后，把镜像包设为 **Public**（Package settings → Change visibility），服务器拉取时就不用登录：

```
https://github.com/users/<owner>/packages/container/itmazai-token/settings
```

保持 Private 也可以，那就需要在服务器上执行一次：

```bash
echo <细粒度 PAT，带 read:packages> | docker login ghcr.io -u <owner> --password-stdin
```

可选：在服务器 `authorized_keys` 里限制来源，降低密钥泄露后的风险（GitHub 托管 runner 出口 IP 不固定，通常只能放开）：

```
from="*",command="/usr/bin/docker compose ..." ssh-ed25519 AAAA...
```

注意：**能执行 docker 的账号等价于 root**（可挂载宿主目录）。请用专用 `deploy` 账号，不要复用运维主账号。

生产环境建议在 Settings → Environments → `production` 里配置 Required reviewers，这样 `deploy` / `rollback` job 会停下来等人点批准，其他环节仍自动。

### 3.2 服务器初始化

```bash
# 本地
scp deploy/bootstrap-server.sh root@<host>:/tmp/
ssh root@<host> 'sudo bash /tmp/bootstrap-server.sh /opt/itmazai'

# 同步部署文件（首次发布前需要，之后 CI 每次自动同步）
scp deploy/docker-compose.infra.yml deploy/.env.example deploy/deploy-remote.sh \
    root@<host>:/opt/itmazai/.deploy/

# 填真实值：POSTGRES_PASSWORD / REDIS_PASSWORD / SESSION_SECRET / SQL_DSN / SESSION_COOKIE_TRUSTED_URL
ssh root@<host> 'vi /opt/itmazai/.env && chmod 600 /opt/itmazai/.env'

# 启动基础设施（只做一次，之后发布不会重启它们）
ssh root@<host> 'cd /opt/itmazai && docker compose \
  --project-directory /opt/itmazai --env-file /opt/itmazai/.env \
  -f .deploy/docker-compose.infra.yml up -d'
```

`SESSION_SECRET` 用 `openssl rand -hex 32` 生成并固定下来，否则每次重启所有人都会被登出。

> 镜像包设为 Private 时，需在服务器上执行一次 `docker login ghcr.io -u <owner> --password-stdin`（凭证存到 `~/.docker/config.json`），否则发布时 `docker compose pull` 会 401。省事的做法是把包设为 **Public**——镜像里没有密钥，配置都在服务器 `.env`。

### 3.3 接管已有栈（2026-11-04 已执行，当前生产即此形态）

生产服务器原本在 `/root/new-api` 用手工方式部署（手工 build 镜像 + 手工打 rollback tag）。切换到 CI/CD 时**没有迁移数据、没有新建 PG/Redis**，而是让新部署体系直接接管：

- `DEPLOY_PATH=/root/new-api`，应用容器从旧栈的 `new-api` 改为 `itmazai-new-api`，端口仍是 `127.0.0.1:3000`，宿主机 Nginx 无需改动。
- **复用旧栈的 postgres:15 / redis**（卷 `new-api_pg_data` / `new-api_redis_data` 原样保留），不运行 `docker-compose.infra.yml`。
- `.env` 由运行中容器的环境变量直接提取生成（值不离开服务器），另加：
  - `APP_NETWORK=new-api_new-api-network`：应用加入旧栈网络，DSN/Redis 主机名仍是 `postgres` / `redis`
  - `PG_CONTAINER=postgres`、`POSTGRES_USER=root`、`POSTGRES_DB=new-api`：让发布前自动备份指向旧 PG
  - `APP_MEMORY_LIMIT=512m`：1GB 内存的机器上收紧上限
- 旧镜像以 `ghcr.io/<owner>/itmazai-token:pre-takeover` 保留为兜底回滚点，`.state/current_tag` 初始值设为 `pre-takeover`。
- 旧容器 `new-api` 已停止但保留（`docker start new-api` 可秒级人工兜底，稳定后可删）。

> 教训：本机 Apple Silicon 构建的镜像是 `linux/arm64`，服务器是 `linux/amd64`，容器会以 `exec format error` 崩溃——部署脚本的自动回滚在这次事故里真实生效（10 秒内切回旧版）。**生产镜像一律由 CI 构建**，不要从开发机直接推。

### 3.4 全新部署（未用过，供参考）

⚠️ **全新部署才有数据风险的一步。** 旧的 `docker-compose.yml` 用目录名做项目名，数据卷实际叫 `<旧目录名>_pg_data`；全新栈用的是固定卷名 `itmazai_pg_data`。两者不是同一个卷，**直接部署会得到一个空数据库**。（当前生产走了 §3.3 接管路线，本节未执行。）

推荐做法（迁移数据，停机约几分钟）：

```bash
# 1) 备份旧库
ssh root@<host> 'docker exec -e PGPASSWORD=<旧密码> <旧pg容器名> \
  pg_dump -U root -d new-api --no-owner | gzip > /root/new-api-old.sql.gz'

# 2) 启动新基础设施
ssh root@<host> 'cd /opt/itmazai && docker compose --project-directory /opt/itmazai \
  --env-file /opt/itmazai/.env -f .deploy/docker-compose.infra.yml up -d'

# 3) 导入
ssh root@<host> 'gunzip -c /root/new-api-old.sql.gz | docker exec -i \
  -e PGPASSWORD=<新密码> itmazai-postgres psql -U itmazai -d new-api'

# 4) 停掉旧应用释放 3000 端口（保留旧卷 1~2 周再删）
ssh root@<host> 'docker stop new-api && docker rename new-api new-api-old'
```

用 SQLite 的话，直接 `scp` 旧的 `one-api.db` 到 `/opt/itmazai/data/` 即可，注意同时拷 `-wal` / `-shm` 或先停旧进程。

确认新栈数据正常后再执行第一次发布；此后不再需要人工上传。

## 4. 日常操作

| 场景 | 操作 |
| --- | --- |
| 正常发布 | PR 通过检查并合入 `main`，自动完成全流程 |
| 重发历史版本 | Actions → **Deploy production** → Run workflow，填 `image_tag`（如 `sha-1a2b3c4d5e6f`） |
| 回滚到上一版 | Actions → **Rollback production** → `tag` 留空 → 填原因 |
| 回滚到指定版 | 同上，`tag` 填具体 sha |
| 查看线上版本 | 服务器 `cat /root/new-api/.state/current_tag` |
| 查看容器状态 | `docker ps --filter name=itmazai-` / `docker logs -f itmazai-new-api` |
| 手工干预发布 | `cd /root/new-api && IMAGE_NAME=ghcr.io/<owner>/itmazai-token IMAGE_TAG=sha-xxx bash .deploy/deploy-remote.sh`（`IMAGE_TAG` 留空 = 回上一版） |
| 停掉应用栈 | `cd /root/new-api && IMAGE_NAME=ghcr.io/<owner>/itmazai-token IMAGE_TAG=$(cat .state/current_tag) docker compose --project-directory . -f .deploy/docker-compose.app.yml down`（compose 文件对镜像 tag 做了非空校验，不带变量会报 interpolating 错误） |
| 本地预演部署 | 在任意目录放一份 `.deploy/` + `.env`，本地打好镜像后：`SKIP_PULL=1 IMAGE_NAME=... IMAGE_TAG=... bash .deploy/deploy-remote.sh`；`SKIP_PULL=1` 表示只用本地镜像，不访问仓库 |

`sha-<12>` 是唯一可追溯的发布单元：`git log` 里的 commit 与镜像 tag 一一对应，`docker inspect` 里也能看到 `org.opencontainers.image.revision`。

## 5. 失败处理对照表

| 现象 | 大概率原因 | 处理 |
| --- | --- | --- |
| quality-gate 失败 | 编译/测试/类型检查不过 | 按日志修代码，PR 上会先拦一次 |
| build 失败 | `web/bun.lock` 与 `package.json` 不一致、前端构建报错 | 本地 `cd web && bun install && bun run build` 复现 |
| smoke 失败 | 镜像起不来、数据库迁移报错、前端未内嵌 | 看该 job 的容器日志输出（失败会自动 `docker logs`） |
| SSH 连接失败 | 私钥/公钥不匹配、主机指纹变了、安全组拦截 | 本地用同一把私钥 `ssh -i` 验证 |
| 部署后 unhealthy | 环境变量缺失、DB 连不上、迁移失败 | **已自动回滚**，看 job 日志里的容器日志，修好再发 |
| 回滚也未恢复 | 数据库不可用 / 配置错误（非版本问题） | 手工 `docker logs itmazai-new-api`，必要时用 `backups/` 恢复 |
| `latest` 没更新 | 部署失败 | 符合预期：只有部署成功才推 `latest` |

部署脚本的退出码：`1` = 发布失败且已回滚；`2` = 回滚后仍不健康，需人工介入。

## 6. 数据库迁移的边界

- 应用启动时会执行 GORM 自动迁移，**回滚镜像不会回滚 schema**。
- 因此约定：迁移只做向后兼容的变更（加表、加列、加索引）；删列/改类型走两步发布（先发兼容版本，再发清理版本）。
- 每次发布前的备份在 `/root/new-api/backups/pre-<tag>-<时间>.sql.gz`，默认保留 7 份（`BACKUP_KEEP` 可调）。备份在**同一块磁盘**上，只防误操作不防磁盘故障，建议加一条异地同步：
  ```bash
  # /etc/cron.daily/itmazai-backup-offsite
  rclone sync /root/new-api/backups remote:itmazai-backups
  ```
- 手工恢复：`gunzip -c backups/pre-xxx.sql.gz | docker exec -i -e PGPASSWORD=... \<PG_CONTAINER> psql -U <POSTGRES_USER> -d new-api`（先停应用；当前生产为 `postgres` 容器、`root` 用户）。

## 7. 安全与成本

已落实：

- 镜像开启 `provenance: mode=max` 与 `sbom: true`，可追溯构建来源与依赖清单。
- 应用端口只绑定 `127.0.0.1:3000`，对外由宿主机 Nginx/Caddy 终结 TLS。
- 容器 `no-new-privileges`、日志按 50MB×5 轮转、内存上限 `APP_MEMORY_LIMIT`（1GB 服务器上设 512m，默认 2g）。
- 生产 `.env` 权限 600，密钥只存在 GitHub Secrets 与服务器本地。
- 生产必须 `SESSION_COOKIE_SECURE=true` 且 `SESSION_COOKIE_TRUSTED_URL` 填精确 HTTPS Origin。

成本参考：单架构构建首跑约 8–12 分钟，缓存命中后 3–5 分钟，公开仓库 Actions 免费；服务器侧只多一个应用容器的开销。

后续可选增强：镜像 cosign 签名（`docker-build.yml` 已有现成写法，可直接移植到 `deploy.yml`）、外部 uptime 探测 `/api/status`、容器重启告警、staging 环境（复制 `deploy.yml` 并把 `DEPLOY_PATH`、`IMAGE_NAME` 换成测试值即可）。
