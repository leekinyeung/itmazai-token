#!/usr/bin/env bash
# 向导式写入发布流水线需要的 GitHub Variables（镜像仓库用 GHCR，不需要任何 token）。
#
# 用法：
#   bash deploy/setup-secrets.sh                  # 自动识别当前仓库
#   bash deploy/setup-secrets.sh owner/repo
set -Eeuo pipefail

REPO="${1:-}"
if [ -z "$REPO" ]; then
  REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)"
fi
[ -n "$REPO" ] || { echo "无法识别仓库，请显式传入 owner/repo"; exit 1; }

command -v gh >/dev/null 2>&1 || { echo "未安装 gh，请先 brew install gh"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "gh 未登录，请先 gh auth login"; exit 1; }

echo "目标仓库：$REPO"
echo "镜像默认推到 ghcr.io/$(echo "$REPO" | cut -d/ -f1)/itmazai-token，登录用 GitHub 内置 token，无需额外密钥。"
echo

ask() {
  local prompt="$1" default="${2:-}" value
  if [ -n "$default" ]; then
    read -r -p "$prompt [$default]: " value
    value="${value:-$default}"
  else
    while [ -z "${value:-}" ]; do read -r -p "$prompt: " value; done
  fi
  printf '%s' "$value"
}

set_var() {
  printf '%s' "$2" | gh variable set "$1" --repo "$REPO" >/dev/null
  echo "  ✓ variable $1 = $2"
}

echo "== 服务器 =="
SSH_HOST="$(ask '服务器地址（IP 或域名）')"
SSH_USER="$(ask 'SSH 用户名' 'root')"
SSH_PORT="$(ask 'SSH 端口' '22')"
DEPLOY_PATH="$(ask '部署目录' '/opt/itmazai')"

echo
echo "写入中…"
set_var SSH_HOST "$SSH_HOST"
set_var SSH_USER "$SSH_USER"
set_var SSH_PORT "$SSH_PORT"
set_var DEPLOY_PATH "$DEPLOY_PATH"

echo
echo "完成。当前仓库配置："
gh variable list --repo "$REPO"
gh secret list --repo "$REPO" || true

cat <<EOF

接下来两步：

1) 把部署公钥装到服务器（只需一次）
  ssh-copy-id -i ~/.ssh/itmazai_deploy_ed25519.pub ${SSH_USER}@${SSH_HOST}

2) 首次推送后把镜像包设为 public，服务器就不用 docker login：
  https://github.com/users/$(echo "$REPO" | cut -d/ -f1)/packages/container/itmazai-token/settings
  → Change visibility → Public
EOF
