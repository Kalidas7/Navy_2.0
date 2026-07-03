#!/usr/bin/env bash
#
# run-local.sh — start the whole app locally for development.
#
#   ./run-local.sh            # localhost only (127.0.0.1)
#   LAN=1 ./run-local.sh      # bind to 0.0.0.0 so other PCs on the network can reach it
#
# Starts:
#   - Django backend on http://<host>:8000     (the JSON API)
#   - Vite frontend  on http://<host>:5173      (the UI; proxies /api -> Django)
#
# Local:  open http://localhost:5173
# LAN:    open http://<this-machine-ip>:5173 from any PC on the same network.
#         (Vite's dev proxy forwards /api to Django on this machine, so visitors
#          need no config and there are no CORS issues.)
# Ctrl-C stops both.
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"

BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

# --- bind address -----------------------------------------------------------
# LAN=1 exposes the servers on all interfaces so other machines can connect.
# Default stays localhost-only for safety.
if [ "${LAN:-0}" = "1" ]; then
  DJANGO_BIND="0.0.0.0:8000"
  # Detect this machine's primary LAN IP for the "open this URL" hint.
  LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
  # Django validates the Host header; allow anything in this trusted-LAN demo.
  export DJANGO_ALLOWED_HOSTS="*"
  echo "==> LAN mode: binding to all interfaces."
else
  DJANGO_BIND="127.0.0.1:8000"
  LAN_IP="localhost"
fi

# --- sanity checks ----------------------------------------------------------
if [ ! -x "$BACKEND/.venv/bin/python" ]; then
  echo "Backend venv missing. Creating it..."
  python3 -m venv "$BACKEND/.venv"
  "$BACKEND/.venv/bin/pip" install -q -r "$BACKEND/requirements.txt"
fi
if [ ! -d "$FRONTEND/node_modules" ]; then
  echo "Frontend deps missing. Installing..."
  ( cd "$FRONTEND" && npm install )
fi

# --- start backend ----------------------------------------------------------
echo "==> Starting Django backend on http://$DJANGO_BIND ..."
( cd "$BACKEND" && exec .venv/bin/python manage.py runserver "$DJANGO_BIND" ) &
DJANGO_PID=$!

cleanup() {
  echo ""
  echo "==> Stopping (Django $DJANGO_PID, Vite $VITE_PID) ..."
  kill "$DJANGO_PID" 2>/dev/null || true
  kill "$VITE_PID"   2>/dev/null || true
}
trap cleanup EXIT INT TERM

# wait for backend to answer (always probe via localhost — it's on this machine)
for i in $(seq 1 20); do
  curl -fsS http://127.0.0.1:8000/ >/dev/null 2>&1 && break
  sleep 1
done
echo "==> Backend up: $(curl -fsS http://127.0.0.1:8000/ 2>/dev/null || echo 'not responding')"

# --- start frontend ---------------------------------------------------------
echo "==> Starting Vite frontend on http://$LAN_IP:5173 ..."
echo "    (uses frontend/.env: VITE_API_BASE_URL=/api, proxied to Django)"
( cd "$FRONTEND" && exec npm run dev ) &
VITE_PID=$!

echo ""
echo "-------------------------------------------------------------------"
echo "  Open  http://$LAN_IP:5173  in your browser."
if [ "${LAN:-0}" = "1" ]; then
  echo "  Other PCs on this network: open the SAME URL above."
fi
echo "  Ctrl-C here stops both servers."
echo "-------------------------------------------------------------------"

wait "$VITE_PID"
