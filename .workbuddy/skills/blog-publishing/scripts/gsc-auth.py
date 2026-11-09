#!/usr/bin/env python3
"""One-time OAuth consent flow for the Search Console API.

Use this when the GCP organization policy iam.disableServiceAccountKeyCreation
blocks service account key downloads. It authorizes a desktop OAuth client with
your own Google account (the one that owns the GSC property) and stores a
refresh token for scripts/gsc-submit.sh.

Usage:
  gsc-auth.py --client-id XXX --client-secret YYY

Creates a desktop OAuth client in Google Cloud Console first (APIs & Services
→ Credentials → Create credentials → OAuth client ID → Desktop app), and set
the OAuth consent screen publishing status to "In production" so the refresh
token does not expire after 7 days.
"""

import argparse
import http.server
import json
import os
import secrets
import stat
import sys
import urllib.parse
import urllib.request
import webbrowser

SCOPE = "https://www.googleapis.com/auth/webmasters"
AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
CONFIG_PATH = os.path.expanduser("~/.config/taodock/gsc-oauth.json")
LISTEN_HOST = "127.0.0.1"
LISTEN_PORT = 8977


def exchange_code(client_id, client_secret, code, redirect_uri):
    payload = urllib.parse.urlencode(
        {
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri,
        }
    ).encode()
    request = urllib.request.Request(TOKEN_URL, data=payload)
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.load(response)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--client-id", required=True)
    parser.add_argument("--client-secret", required=True)
    args = parser.parse_args()

    redirect_uri = f"http://{LISTEN_HOST}:{LISTEN_PORT}"
    state = secrets.token_urlsafe(16)
    captured = {}

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            query = urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)
            if query.get("state") == [state] and query.get("code"):
                captured["code"] = query["code"][0]
                self.send_response(200)
                self.end_headers()
                self.wfile.write(
                    "Authorization complete. You can close this tab.".encode()
                )
            else:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b"Authorization failed: state mismatch.")

        def log_message(self, *args):
            pass

    server = http.server.HTTPServer((LISTEN_HOST, LISTEN_PORT), Handler)
    params = urllib.parse.urlencode(
        {
            "client_id": args.client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": SCOPE,
            "access_type": "offline",
            "prompt": "consent",
            "state": state,
        }
    )
    url = f"{AUTH_URL}?{params}"
    print(f"Opening the browser for Google authorization: {url}")
    webbrowser.open(url)
    server.handle_request()
    server.server_close()

    if "code" not in captured:
        sys.exit("error: no authorization code captured")

    tokens = exchange_code(args.client_id, args.client_secret, captured["code"], redirect_uri)
    if "refresh_token" not in tokens:
        sys.exit(
            "error: no refresh_token in the response; rerun with prompt=consent "
            "(this script already sets it) and make sure to approve the scopes"
        )

    os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
    with open(CONFIG_PATH, "w") as handle:
        json.dump(
            {
                "client_id": args.client_id,
                "client_secret": args.client_secret,
                "refresh_token": tokens["refresh_token"],
            },
            handle,
            indent=2,
        )
        handle.write("\n")
    os.chmod(CONFIG_PATH, stat.S_IRUSR | stat.S_IWUSR)
    print(f"Saved OAuth credentials to {CONFIG_PATH}")
    print("Next: scripts/gsc-submit.sh will pick them up automatically.")


if __name__ == "__main__":
    main()
