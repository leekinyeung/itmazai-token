#!/usr/bin/env bash
# Submit sitemap.xml and feed.xml to Google Search Console via the
# Search Console API, using a service account JSON key.
#
# One-time setup: see references/deploy-and-gsc.md (create a service
# account, download its JSON key, and add the SA email as a user of the
# GSC property).
#
# Usage:
#   GSC_SA_KEY=/path/to/service-account.json scripts/gsc-submit.sh
# Optional env:
#   GSC_SITE_URL   property identifier, default sc-domain:taodock.com
set -euo pipefail

KEY_FILE="${GSC_SA_KEY:-$HOME/.config/taodock/gsc-service-account.json}"
SITE="${GSC_SITE_URL:-sc-domain:taodock.com}"
SITEMAPS=("https://taodock.com/sitemap.xml" "https://taodock.com/feed.xml")

if [ ! -f "$KEY_FILE" ]; then
  cat >&2 <<EOF
error: service account key not found at $KEY_FILE
Set GSC_SA_KEY to the JSON key path, or follow the one-time setup in
.workbuddy/skills/blog-publishing/references/deploy-and-gsc.md first.
EOF
  exit 1
fi

for bin in curl openssl python3; do
  command -v "$bin" >/dev/null 2>&1 || { echo "error: $bin is required" >&2; exit 1; }
done

b64url() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }

client_email="$(python3 -c "import json;print(json.load(open('$KEY_FILE'))['client_email'])")"
python3 -c "import json,sys;sys.stdout.write(json.load(open('$KEY_FILE'))['private_key'])" > /tmp/gsc-sa-key.pem
trap 'rm -f /tmp/gsc-sa-key.pem' EXIT

now="$(date +%s)"
header='{"alg":"RS256","typ":"JWT"}'
claims="{\"iss\":\"$client_email\",\"scope\":\"https://www.googleapis.com/auth/webmasters\",\"aud\":\"https://oauth2.googleapis.com/token\",\"iat\":$now,\"exp\":$((now + 3600))}"
unsigned="$(printf '%s' "$header" | b64url).$(printf '%s' "$claims" | b64url)"
signature="$(printf '%s' "$unsigned" | openssl dgst -sha256 -sign /tmp/gsc-sa-key.pem | b64url)"
jwt="$unsigned.$signature"

access_token="$(curl -fsS --max-time 20 -X POST https://oauth2.googleapis.com/token \
  -d "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=$jwt" \
  | python3 -c "import json,sys;print(json.load(sys.stdin)['access_token'])")"

failures=0
for sitemap in "${SITEMAPS[@]}"; do
  encoded_site="$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1], safe=''))" "$SITE")"
  encoded_path="$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1], safe=''))" "$sitemap")"
  code="$(curl -s -o /tmp/gsc-submit-response.txt -w '%{http_code}' --max-time 20 -X PUT \
    -H "Authorization: Bearer $access_token" \
    "https://searchconsole.googleapis.com/v1/sites/$encoded_site/sitemaps/$encoded_path")"
  if [ "$code" = "200" ] || [ "$code" = "204" ]; then
    echo "ok   submitted $sitemap"
  else
    echo "FAIL $sitemap (HTTP $code): $(cat /tmp/gsc-submit-response.txt)" >&2
    failures=$((failures + 1))
  fi
done

rm -f /tmp/gsc-submit-response.txt
[ "$failures" -eq 0 ] || exit 1
echo "GSC submission complete"
