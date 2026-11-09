#!/usr/bin/env bash
# Submit sitemap.xml and feed.xml to Google Search Console via the
# Search Console API.
#
# Two auth modes, auto-detected:
#   A) Service account key: GSC_SA_KEY=/path/to/service-account.json
#      (blocked in some GCP orgs by iam.disableServiceAccountKeyCreation)
#   B) OAuth refresh token (recommended fallback): run
#      scripts/gsc-auth.py --client-id ... --client-secret ... once; the
#      credentials are stored in ~/.config/taodock/gsc-oauth.json.
#      Override the path with GSC_OAUTH_FILE.
#
# One-time setup for both modes: references/deploy-and-gsc.md.
#
# Optional env:
#   GSC_SITE_URL   property identifier, default sc-domain:taodock.com
set -euo pipefail

SA_KEY_FILE="${GSC_SA_KEY:-$HOME/.config/taodock/gsc-service-account.json}"
OAUTH_FILE="${GSC_OAUTH_FILE:-$HOME/.config/taodock/gsc-oauth.json}"
SITE="${GSC_SITE_URL:-sc-domain:taodock.com}"
SITEMAPS=("https://taodock.com/sitemap.xml" "https://taodock.com/feed.xml")

for bin in curl openssl python3; do
  command -v "$bin" >/dev/null 2>&1 || { echo "error: $bin is required" >&2; exit 1; }
done

b64url() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }

access_token=""
if [ -f "$SA_KEY_FILE" ]; then
  # Mode A: service account JWT bearer flow.
  client_email="$(python3 -c "import json;print(json.load(open('$SA_KEY_FILE'))['client_email'])")"
  python3 -c "import json,sys;sys.stdout.write(json.load(open('$SA_KEY_FILE'))['private_key'])" > /tmp/gsc-sa-key.pem
  trap 'rm -f /tmp/gsc-sa-key.pem /tmp/gsc-submit-response.txt' EXIT

  now="$(date +%s)"
  header='{"alg":"RS256","typ":"JWT"}'
  claims="{\"iss\":\"$client_email\",\"scope\":\"https://www.googleapis.com/auth/webmasters\",\"aud\":\"https://oauth2.googleapis.com/token\",\"iat\":$now,\"exp\":$((now + 3600))}"
  unsigned="$(printf '%s' "$header" | b64url).$(printf '%s' "$claims" | b64url)"
  signature="$(printf '%s' "$unsigned" | openssl dgst -sha256 -sign /tmp/gsc-sa-key.pem | b64url)"
  access_token="$(curl -fsS --max-time 20 -X POST https://oauth2.googleapis.com/token \
    -d "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=$unsigned.$signature" \
    | python3 -c "import json,sys;print(json.load(sys.stdin)['access_token'])")"
elif [ -f "$OAUTH_FILE" ]; then
  # Mode B: OAuth refresh token flow.
  oauth_client_id="$(python3 -c "import json;print(json.load(open('$OAUTH_FILE'))['client_id'])")"
  oauth_client_secret="$(python3 -c "import json;print(json.load(open('$OAUTH_FILE'))['client_secret'])")"
  oauth_refresh_token="$(python3 -c "import json;print(json.load(open('$OAUTH_FILE'))['refresh_token'])")"
  trap 'rm -f /tmp/gsc-submit-response.txt' EXIT
  access_token="$(curl -fsS --max-time 20 -X POST https://oauth2.googleapis.com/token \
    -d "client_id=$oauth_client_id" \
    -d "client_secret=$oauth_client_secret" \
    -d "refresh_token=$oauth_refresh_token" \
    -d "grant_type=refresh_token" \
    | python3 -c "import json,sys;print(json.load(sys.stdin)['access_token'])")"
else
  cat >&2 <<EOF
error: no GSC credentials found.
Checked:
  service account key: $SA_KEY_FILE
  OAuth credentials:   $OAUTH_FILE
Run scripts/gsc-auth.py --client-id ... --client-secret ... for the OAuth
flow (recommended when the org policy blocks service account keys), or see
references/deploy-and-gsc.md for both setup paths.
EOF
  exit 1
fi

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

[ "$failures" -eq 0 ] || exit 1
echo "GSC submission complete"
