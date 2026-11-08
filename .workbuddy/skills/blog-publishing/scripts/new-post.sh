#!/usr/bin/env bash
# Scaffold a new blog article for the TaoDock/new-api static content pipeline.
# Usage: scripts/new-post.sh <slug>
# Run from the repository root. Creates web/src/content/blog/<slug>.md with
# today's date filled in. Edit the remaining placeholders before publishing.
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "usage: $0 <slug>" >&2
  exit 1
fi

slug="$1"
if ! [[ "$slug" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
  echo "error: slug must match ^[a-z0-9]+(-[a-z0-9]+)*$ (got: $slug)" >&2
  exit 1
fi

repo_root="$(cd "$(dirname "$0")/../../../.." && pwd)"
template="$repo_root/.workbuddy/skills/blog-publishing/assets/article-template.md"
target="$repo_root/web/src/content/blog/$slug.md"

if [ -e "$target" ]; then
  echo "error: $target already exists" >&2
  exit 1
fi

today="$(date +%F)"
sed -e "s/__SLUG__/$slug/g" -e "s/__DATE__/$today/g" "$template" > "$target"

echo "created $target"
echo "next: fill title/description/primaryKeyword/cluster and write the body,"
echo "then run: cd web && bun run content:generate"
