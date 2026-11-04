#!/usr/bin/env bash
# 服务器一次性初始化（幂等，可重复执行）。
#
# 用法（在目标服务器上，root 或有 sudo 的账号）：
#   sudo bash bootstrap-server.sh /opt/itmazai
#
# 它会：安装 Docker → 建目录 → 建 itmazai-net 网络 → 准备 .env 骨架。
# 它不会：启动数据库、迁移旧数据、改动已有容器。
set -Eeuo pipefail

APP_DIR="${1:-/opt/itmazai}"
log() { printf '[bootstrap] %s\n' "$*"; }
die() { printf '[bootstrap] ERROR: %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "请用 root 或 sudo 执行"

if ! command -v docker >/dev/null 2>&1; then
  log "未检测到 Docker，开始安装"
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update -qq
    apt-get install -y -qq ca-certificates curl gnupg >/dev/null
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc 2>/dev/null \
      || curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    . /etc/os-release
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/${ID} ${VERSION_CODENAME} stable" \
      > /etc/apt/sources.list.d/docker.list
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin >/dev/null
  else
    die "非 apt 系统，请手动安装 Docker 后重跑本脚本"
  fi
else
  log "已安装 Docker：$(docker --version)"
fi

docker compose version >/dev/null 2>&1 || die "缺少 docker compose 插件（v2）"

systemctl enable --now docker >/dev/null 2>&1 || true

log "创建目录 $APP_DIR"
mkdir -p "$APP_DIR"/{data,logs,backups,.deploy,.state}

if ! docker network inspect itmazai-net >/dev/null 2>&1; then
  log "创建 docker 网络 itmazai-net"
  docker network create itmazai-net >/dev/null
else
  log "docker 网络 itmazai-net 已存在"
fi

if [ ! -f "$APP_DIR/.env" ]; then
  if [ -f "$APP_DIR/.deploy/.env.example" ]; then
    cp "$APP_DIR/.deploy/.env.example" "$APP_DIR/.env"
    log "已从模板生成 $APP_DIR/.env —— 必须填写真实密码后再生效"
  else
    log "警告：未找到 .deploy/.env.example，请手工创建 $APP_DIR/.env"
  fi
fi
chmod 600 "$APP_DIR/.env" 2>/dev/null || true

if command -v ss >/dev/null 2>&1 && ss -ltn 2>/dev/null | grep -q ':3000 '; then
  log "警告：宿主机 3000 端口已被占用（可能是旧容器），首次部署前请停掉旧实例"
fi

cat <<EOF

[bootstrap] 完成。后续步骤：
  1. 本地执行：scp deploy/docker-compose.infra.yml deploy/.env.example deploy/deploy-remote.sh \\
       root@<host>:$APP_DIR/.deploy/
  2. 编辑 $APP_DIR/.env，填好 POSTGRES_PASSWORD / REDIS_PASSWORD / SESSION_SECRET / SQL_DSN
  3. 启动基础设施：cd $APP_DIR && docker compose --project-directory $APP_DIR \\
       --env-file $APP_DIR/.env -f .deploy/docker-compose.infra.yml up -d
  4. 之后每次发布由 GitHub Actions 自动完成，无需登录服务器。
EOF
