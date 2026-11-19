#!/usr/bin/env bash
# 在目标服务器上执行的一次部署：拉镜像 → 备份数据库 → 重建应用容器 → 健康检查 → 失败自动回滚。
#
# 由 .github/workflows/deploy.yml 通过 SSH 调用，也可在服务器上手工执行：
#   IMAGE_NAME=leekinyeung/itmazai-token IMAGE_TAG=sha-1a2b3c4 DEPLOY_GEO_WORKER=1 bash .deploy/deploy-remote.sh
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

[ -n "${IMAGE_NAME:-}" ] || die "IMAGE_NAME 未设置"
[ -f "$COMPOSE_APP" ] || die "缺少 ${COMPOSE_APP}（应先由 CI 同步部署文件）"
[ -f "$ENV_FILE" ] || die "缺少 ${ENV_FILE}，请先复制 deploy/.env.example 并填写"

# 镜像版本和服务范围由本次发布指定，服务器 .env 提供运行配置和密钥。
release_image_name="$IMAGE_NAME"
release_image_tag="${IMAGE_TAG:-}"
deploy_geo_worker="${DEPLOY_GEO_WORKER:-}"
# 载入 .env：既给备份步骤取数据库口令，也让 compose 插值（APP_PORT 等）以服务器配置为准。
set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

IMAGE_NAME="$release_image_name"
IMAGE_TAG="$release_image_tag"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-180}"
BACKUP_KEEP="${BACKUP_KEEP:-7}"
APP_PORT="${APP_PORT:-3000}"

# 未指定 tag 时回退到上一个成功版本（用于回滚）。
if [ -z "${IMAGE_TAG:-}" ]; then
  IMAGE_TAG="$(cat "$STATE_DIR/previous_tag" 2>/dev/null || true)"
  [ -n "$IMAGE_TAG" ] || die "未指定 IMAGE_TAG，且服务器上没有历史版本记录"
  log "未指定 IMAGE_TAG，使用上一个成功版本：$IMAGE_TAG"
fi

[[ "$IMAGE_TAG" =~ ^[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,127}$ ]] || die "无效的镜像 tag"
previous_tag="$(cat "$STATE_DIR/current_tag" 2>/dev/null || true)"
[[ -z "$previous_tag" || "$previous_tag" =~ ^[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,127}$ ]] || die "部署状态中的当前 tag 无效"

export IMAGE_NAME IMAGE_TAG APP_PORT GEO_WORKER_IMAGE GEO_WORKER_ARTIFACT_PROXY
export APP_ENV_FILE="$ENV_FILE"
export COMPOSE_PROJECT_NAME=itmazai-app

compose_app() {
  docker compose --project-directory "$APP_DIR" -f "$COMPOSE_APP" "$@"
}

configure_release() {
  IMAGE_TAG="$1"
  GEO_WORKER_IMAGE="$2"
  GEO_WORKER_ARTIFACT_PROXY=false
  release_services=(new-api)
  release_images=("$IMAGE_NAME:$IMAGE_TAG")
  if [ -n "$GEO_WORKER_IMAGE" ]; then
    GEO_WORKER_ARTIFACT_PROXY=true
    release_services+=(geo-worker)
    release_images+=("$GEO_WORKER_IMAGE")
  fi
}

start_release() {
  local service container_id health
  if [ -z "$GEO_WORKER_IMAGE" ]; then
    compose_app --profile geo stop geo-worker || return 1
  fi
  compose_app up -d --wait --wait-timeout "$HEALTH_TIMEOUT" --pull never --remove-orphans "${release_services[@]}" || return 1

  # 检查实际容器状态，避免 Compose 在等待超时后退出时误记为发布成功。
  for service in "${release_services[@]}"; do
    container_id="$(compose_app --profile geo ps -q "$service")" || return 1
    if [ -z "$container_id" ]; then
      log "服务容器未运行：$service"
      return 1
    fi
    health="$(docker inspect --type container --format '{{.State.Health.Status}}' "$container_id")" || return 1
    if [ "$health" != healthy ]; then
      log "服务未通过健康检查：$service（$health）"
      return 1
    fi
  done
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

previous_worker_image=""
if [ -n "$previous_tag" ] && [ -f "$STATE_DIR/geo-worker/$previous_tag" ]; then
  previous_worker_image="$(cat "$STATE_DIR/geo-worker/$previous_tag")"
fi

worker_image=""
case "$deploy_geo_worker" in
  1)
    [ "${#IMAGE_TAG}" -le 117 ] || die "镜像 tag 太长，无法生成配套的 GEO Worker tag"
    worker_image="$IMAGE_NAME:geo-worker-$IMAGE_TAG"
    ;;
  0) ;;
  "")
    # 回滚读取目标版本发布成功时记录的 Worker 镜像。旧版本没有配套镜像。
    if [ -f "$STATE_DIR/geo-worker/$IMAGE_TAG" ]; then
      worker_image="$(cat "$STATE_DIR/geo-worker/$IMAGE_TAG")"
    fi
    ;;
  *) die "DEPLOY_GEO_WORKER 必须为 1 或 0" ;;
esac
if [ -n "$worker_image" ] && [[ ! "${GEO_WORKER_TOKEN:-}" =~ ^[A-Za-z0-9_-]{43}$ ]]; then
  die "请在服务器 .env 配置有效的 GEO_WORKER_TOKEN，并在 TaoDock 的 geo 渠道使用同一个密钥"
fi

configure_release "$IMAGE_TAG" "$worker_image"
log "目标镜像：$IMAGE_NAME:${IMAGE_TAG}（当前运行：${previous_tag:-无}）"
if [ -n "$GEO_WORKER_IMAGE" ]; then
  log "GEO Worker 镜像：$GEO_WORKER_IMAGE"
fi

if [ "${SKIP_PULL:-0}" = "1" ]; then
  log "SKIP_PULL=1，跳过拉取，直接使用本地镜像"
  docker image inspect "${release_images[@]}" >/dev/null || die "本地缺少发布镜像"
elif ! compose_app pull "${release_services[@]}"; then
  log "镜像拉取失败。镜像包若是 Private，请先在服务器执行一次："
  log "  echo <read:packages 权限的 PAT> | docker login ${IMAGE_NAME%%/*} -u <owner> --password-stdin"
  log "或把包设为 Public（Package settings → Change visibility）。"
  die "无法拉取发布镜像"
else
  log "镜像拉取完成"
fi

mkdir -p "$STATE_DIR/geo-worker" "$BACKUP_DIR" "$APP_DIR/data" "$APP_DIR/logs"

# 网络默认由 infra 栈创建；首次发布若还没起 infra 这里补建。
docker network inspect "${APP_NETWORK:-itmazai-net}" >/dev/null 2>&1 \
  || docker network create "${APP_NETWORK:-itmazai-net}" >/dev/null

backup_db

log "启动发布服务并等待健康检查"
if start_release; then
  printf '%s\n' "$GEO_WORKER_IMAGE" > "$STATE_DIR/geo-worker/$IMAGE_TAG.tmp"
  mv "$STATE_DIR/geo-worker/$IMAGE_TAG.tmp" "$STATE_DIR/geo-worker/$IMAGE_TAG"
  if [ -n "$previous_tag" ] && [ "$previous_tag" != "$IMAGE_TAG" ]; then
    printf '%s\n' "$previous_tag" > "$STATE_DIR/previous_tag"
  fi
  printf '%s\n' "$IMAGE_TAG" > "$STATE_DIR/current_tag"
  log "部署成功：$IMAGE_TAG"
  compose_app --profile geo ps
  exit 0
fi

log "新版本启动失败或未通过健康检查，输出最近日志"
compose_app --profile geo logs --tail 120 "${release_services[@]}" || true

if [ -n "$previous_tag" ] && { [ "$previous_tag" != "$IMAGE_TAG" ] || [ "$previous_worker_image" != "$GEO_WORKER_IMAGE" ]; }; then
  log "开始回滚到 $previous_tag"
  configure_release "$previous_tag" "$previous_worker_image"
  if docker image inspect "${release_images[@]}" >/dev/null && start_release; then
    log "回滚成功，当前运行 $previous_tag"
    die "本次发布失败，已自动回滚到 ${previous_tag}；请检查上方日志"
  fi
fi

die "未能恢复健康状态，请检查上方日志"
