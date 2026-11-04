#!/usr/bin/env bash
# 在目标服务器上执行的一次部署：拉镜像 → 备份数据库 → 重建应用容器 → 健康检查 → 失败自动回滚。
#
# 由 .github/workflows/deploy.yml 通过 SSH 调用，也可在服务器上手工执行：
#   IMAGE_NAME=leekinyeung/itmazai-token IMAGE_TAG=sha-1a2b3c4 bash .deploy/deploy-remote.sh
#   IMAGE_NAME=... IMAGE_TAG=                 # 留空 = 回到上一个成功版本
set -Eeuo pipefail

log() { printf '[deploy %s] %s\n' "$(date +%H:%M:%S)" "$*"; }
die() { printf '[deploy %s] ERROR: %s\n' "$(date +%H:%M:%S)" "$*" >&2; exit 1; }

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_DIR="$APP_DIR/.deploy"
STATE_DIR="$APP_DIR/.state"
BACKUP_DIR="$APP_DIR/backups"
COMPOSE_APP="$DEPLOY_DIR/docker-compose.app.yml"
ENV_FILE="$APP_DIR/.env"

APP_NAME="itmazai-new-api"

[ -n "${IMAGE_NAME:-}" ] || die "IMAGE_NAME 未设置"
[ -f "$COMPOSE_APP" ] || die "缺少 ${COMPOSE_APP}（应先由 CI 同步部署文件）"
[ -f "$ENV_FILE" ] || die "缺少 ${ENV_FILE}，请先复制 deploy/.env.example 并填写"

# 载入 .env：既给备份步骤取数据库口令，也让 compose 插值（APP_PORT 等）以服务器配置为准。
set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-180}"
BACKUP_KEEP="${BACKUP_KEEP:-7}"
APP_PORT="${APP_PORT:-3000}"

# 未指定 tag 时回退到上一个成功版本（用于回滚）。
if [ -z "${IMAGE_TAG:-}" ]; then
  IMAGE_TAG="$(cat "$STATE_DIR/previous_tag" 2>/dev/null || true)"
  [ -n "$IMAGE_TAG" ] || die "未指定 IMAGE_TAG，且服务器上没有历史版本记录"
  log "未指定 IMAGE_TAG，使用上一个成功版本：$IMAGE_TAG"
fi

export IMAGE_NAME IMAGE_TAG APP_PORT
export APP_ENV_FILE="$ENV_FILE"
export COMPOSE_PROJECT_NAME=itmazai-app

mkdir -p "$STATE_DIR" "$BACKUP_DIR" "$APP_DIR/data" "$APP_DIR/logs"

# 网络默认由 infra 栈创建；首次发布若还没起 infra 这里补建。
# 接管已有栈时 .env 里设 APP_NETWORK 指向既有网络（已存在，跳过创建）。
docker network inspect "${APP_NETWORK:-itmazai-net}" >/dev/null 2>&1 \
  || docker network create "${APP_NETWORK:-itmazai-net}" >/dev/null

compose_app() {
  docker compose --project-directory "$APP_DIR" -f "$COMPOSE_APP" "$@"
}

container_state() {
  docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
    "$APP_NAME" 2>/dev/null || echo missing
}

wait_healthy() {
  local deadline=$((SECONDS + HEALTH_TIMEOUT)) state
  while [ "$SECONDS" -lt "$deadline" ]; do
    state="$(container_state)"
    case "$state" in
      healthy) log "健康检查通过"; return 0 ;;
      unhealthy|exited|dead) log "容器状态异常：$state"; return 1 ;;
    esac
    sleep 3
  done
  log "等待健康检查超时（${HEALTH_TIMEOUT}s，最后状态：$(container_state)）"
  return 1
}

backup_db() {
  if [ "${SKIP_BACKUP:-0}" = "1" ]; then
    log "SKIP_BACKUP=1，跳过数据库备份"
    return 0
  fi
  local pg_container="${PG_CONTAINER:-itmazai-postgres}"
  if ! docker ps --format '{{.Names}}' | grep -qx "$pg_container"; then
    log "未检测到 postgres 容器（$pg_container），跳过备份（使用外部数据库时请自行备份）"
    return 0
  fi

  local out
  out="$BACKUP_DIR/pre-${IMAGE_TAG}-$(date +%Y%m%d%H%M%S).sql.gz"
  log "备份数据库 -> $out"
  if ! docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$pg_container" \
      pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner | gzip > "$out"; then
    rm -f "$out"
    if [ "${ALLOW_NO_BACKUP:-0}" = "1" ]; then
      log "备份失败，但 ALLOW_NO_BACKUP=1，继续部署"
      return 0
    fi
    die "数据库备份失败，已中止部署（确认可跳过时设置 ALLOW_NO_BACKUP=1）"
  fi
  log "备份完成：$(du -h "$out" | cut -f1)"

  # 只保留最近 BACKUP_KEEP 份，避免磁盘被备份撑满。
  # shellcheck disable=SC2012 # tag 与时间戳组成的安全文件名，不存在特殊字符
  ls -1t "$BACKUP_DIR"/pre-*.sql.gz 2>/dev/null \
    | tail -n +$((BACKUP_KEEP + 1)) | xargs -r rm -f
}

previous_tag="$(cat "$STATE_DIR/current_tag" 2>/dev/null || true)"
log "目标镜像：$IMAGE_NAME:${IMAGE_TAG}（当前运行：${previous_tag:-无}）"

if [ "${SKIP_PULL:-0}" = "1" ]; then
  log "SKIP_PULL=1，跳过拉取，直接使用本地镜像"
elif ! compose_app pull; then
  log "镜像拉取失败。镜像包若是 Private，请先在服务器执行一次："
  log "  echo <read:packages 权限的 PAT> | docker login ${IMAGE_NAME%%/*} -u <owner> --password-stdin"
  log "或把包设为 Public（Package settings → Change visibility）。"
  die "无法拉取 ${IMAGE_NAME}:${IMAGE_TAG}"
else
  log "镜像拉取完成"
fi

backup_db

log "启动应用容器"
compose_app up -d --remove-orphans

if wait_healthy; then
  if [ -n "$previous_tag" ]; then
    printf '%s\n' "$previous_tag" > "$STATE_DIR/previous_tag"
  fi
  printf '%s\n' "$IMAGE_TAG" > "$STATE_DIR/current_tag"
  log "部署成功：$IMAGE_TAG"
  compose_app ps
  exit 0
fi

log "新版本不健康，输出最近日志"
compose_app logs --tail 120 new-api || true

if [ -n "$previous_tag" ] && [ "$previous_tag" != "$IMAGE_TAG" ]; then
  log "开始回滚到 $previous_tag"
  export IMAGE_TAG="$previous_tag"
  compose_app up -d --remove-orphans
  if wait_healthy; then
    printf '%s\n' "$previous_tag" > "$STATE_DIR/current_tag"
    log "回滚成功，当前运行 $previous_tag"
    die "本次发布失败，已自动回滚到 ${previous_tag}；请检查上方日志"
  fi
fi

die "回滚未恢复健康状态，需要人工介入（docker logs ${APP_NAME}）"
