#!/usr/bin/env bash
# Verify that a blog article is live on production with its SEO wiring intact.
# Usage: scripts/verify-live.sh <slug> [slug...]
# Exits non-zero if any check fails.
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "usage: $0 <slug> [slug...]" >&2
  exit 1
fi

BASE="${PRODUCTION_URL:-https://taodock.com}"
failures=0

fetch() { curl -fsS --max-time 15 "$1"; }

check_body() { # <label> <body> <expected-substring>
  local label="$1" body="$2" needle="$3"
  if printf '%s' "$body" | grep -qF "$needle"; then
    printf 'ok   %s\n' "$label"
  else
    printf 'FAIL %s\n' "$label" >&2
    failures=$((failures + 1))
  fi
}

hub_body="$(fetch "$BASE/blog")"
check_body "hub /blog has SSR title" "$hub_body" '<title>Taodock Blog | Taodock</title>'
check_body "hub /blog has canonical" "$hub_body" 'rel="canonical" href="https://taodock.com/blog"'

feed_body="$(fetch "$BASE/feed.xml")"
check_body "feed.xml is valid RSS" "$feed_body" '<rss version="2.0"'

sitemap_body="$(fetch "$BASE/sitemap.xml")"

for slug in "$@"; do
  url="$BASE/blog/$slug"
  article_body="$(fetch "$url")"
  check_body "article $slug has SSR title" "$article_body" '<title>'
  check_body "article $slug has canonical" "$article_body" "rel=\"canonical\" href=\"$url\""
  check_body "article $slug has JSON-LD" "$article_body" 'application/ld+json'
  check_body "article $slug in sitemap" "$sitemap_body" "blog/$slug</loc>"
  check_body "article $slug in feed" "$feed_body" "blog/$slug"
done

if [ "$failures" -gt 0 ]; then
  echo "$failures check(s) failed" >&2
  exit 1
fi
echo "all checks passed"
