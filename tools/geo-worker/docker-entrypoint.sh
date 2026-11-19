#!/usr/bin/env bash
set -euo pipefail
umask 077

mode="${1:-serve}"
case "$mode" in
  serve|login) ;;
  *) echo 'Usage: geo-worker serve|login' >&2; exit 2 ;;
esac

exec 9>/var/lib/geo-worker/profile.lock
if ! flock -n 9; then
  echo 'The DeepSeek profile is in use. Stop the running GEO Worker before signing in.' >&2
  exit 1
fi

runtime_dir="$(mktemp -d)"
trap 'rm -rf "$runtime_dir"' EXIT

if [[ "$mode" == login ]]; then
  read -r -s -p 'Enter the 8-character temporary VNC password: ' password
  echo
  if [[ ! "$password" =~ ^[A-Za-z0-9+/]{8}$ ]]; then
    echo 'Generate a temporary password with openssl rand -base64 6.' >&2
    exit 2
  fi
  printf '%s\n' "$password" > "$runtime_dir/vnc-password"
  unset password
fi

# Xvfb signals readiness by writing the display number to this file.
Xvfb -displayfd 3 -screen 0 1280x900x24 -nolisten tcp 3>"$runtime_dir/display" &
display_pid=$!
vnc_pid=''
trap 'kill "${vnc_pid:-$display_pid}" "$display_pid" 2>/dev/null || true; rm -rf "$runtime_dir"' EXIT
for ((attempt = 0; attempt < 100; attempt++)); do
  [[ -s "$runtime_dir/display" ]] && break
  kill -0 "$display_pid" 2>/dev/null || break
  sleep 0.05
done
if [[ ! -s "$runtime_dir/display" ]]; then
  echo 'Could not start the Chromium display.' >&2
  exit 1
fi
export DISPLAY=":$(cat "$runtime_dir/display")"

script=start.js
if [[ "$mode" == login ]]; then
  x11vnc -display "$DISPLAY" -rfbport 5900 -passwdfile "$runtime_dir/vnc-password" -forever -nosel &
  vnc_pid=$!
  script=login-deepseek.js
fi

# Retain the terminal for manual login and let Node close Chromium before Xvfb exits.
exec 3<&0
node "$script" <&3 &
app_pid=$!
trap 'kill -TERM "$app_pid" 2>/dev/null || true; wait "$app_pid" || true; exit 143' TERM INT
wait "$app_pid"
