#!/usr/bin/env bash
#
# serve.sh — ONE command to host the whole app on any PC.
#
#   ./serve.sh
#
# On a fresh machine this will, with no other setup:
#   1. Create the Python virtualenv + install backend deps (first run only).
#   2. Install frontend deps via npm (first run only).
#   3. Start the Django backend  (this PC's real metrics via psutil).
#   4. Start the Vite frontend    (the dashboard UI).
#
# Both bind to ALL network interfaces, so any PC on the same network can view
# the dashboard at:   http://<this-machine-ip>:5173
# The dashboard always shows THIS computer's stats (backend reads local psutil).
#
# Localhost-only instead of LAN?   LAN=0 ./serve.sh
# Ctrl-C stops both servers.
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
RUN_DIR="$ROOT/.run"
PID_FILE="$RUN_DIR/serve.pids"

mkdir -p "$RUN_DIR"

find_free_port() {
  local start_port="$1"
  local port="$start_port"
  while :; do
    if command -v python3 >/dev/null 2>&1; then
      if python3 - "$port" <<'PY' >/dev/null 2>&1; then
import socket
import sys

port = int(sys.argv[1])
with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        sock.bind(("127.0.0.1", port))
    except OSError:
        raise SystemExit(1)
PY
        echo "$port"
        return 0
      fi
    fi
    port=$((port + 1))
  done
}

install_backend_requirements() {
  local pybin="$1"

  if ! "$pybin" -m pip --version >/dev/null 2>&1; then
    echo "==> Bootstrapping pip inside the backend virtualenv ..."
    "$pybin" -m ensurepip --upgrade >/dev/null 2>&1 || {
      echo "ERROR: pip is missing from the backend virtualenv and ensurepip failed." >&2
      exit 1
    }
  fi

  "$pybin" -m pip install --quiet --upgrade pip
  "$pybin" -m pip install --quiet -r "$BACKEND/requirements.txt"
}

# --- pick a python interpreter ---------------------------------------------
# Prefer python3, fall back to python. Fail loudly if neither exists so the
# user knows exactly what to install rather than getting a confusing error.
if command -v python3 >/dev/null 2>&1; then
  PY=python3
elif command -v python >/dev/null 2>&1; then
  PY=python
else
  echo "ERROR: Python is not installed. Install Python 3.10+ and re-run." >&2
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm (Node.js) is not installed. Install Node.js 18+ and re-run." >&2
  exit 1
fi

# --- bind address -----------------------------------------------------------
# LAN hosting is the DEFAULT (LAN=1). Set LAN=0 for localhost-only.
if [ "${LAN:-1}" = "1" ]; then
  DJANGO_BIND="0.0.0.0:8000"
  LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
  [ -z "$LAN_IP" ] && LAN_IP="$(hostname 2>/dev/null || echo localhost)"
  # Django validates the Host header; allow anything on a trusted LAN.
  export DJANGO_ALLOWED_HOSTS="*"
  echo "==> LAN mode: hosting on all network interfaces."
else
  DJANGO_BIND="127.0.0.1:8000"
  LAN_IP="localhost"
  echo "==> Localhost-only mode."
fi

# --- first-run setup: backend venv + deps ----------------------------------
VENV_PY="$BACKEND/.venv/bin/python"
[ -x "$VENV_PY" ] || VENV_PY="$BACKEND/.venv/Scripts/python.exe"   # Windows layout
if [ ! -x "$VENV_PY" ]; then
  echo "==> First run: creating Python virtualenv + installing backend deps ..."
  "$PY" -m venv "$BACKEND/.venv"
  VENV_PY="$BACKEND/.venv/bin/python"
  [ -x "$VENV_PY" ] || VENV_PY="$BACKEND/.venv/Scripts/python.exe"
  install_backend_requirements "$VENV_PY"
fi

if ! "$VENV_PY" -c 'import django' >/dev/null 2>&1; then
  echo "==> Repairing backend environment: installing Python dependencies ..."
  install_backend_requirements "$VENV_PY"
fi

# --- first-run setup: frontend deps ----------------------------------------
if [ ! -d "$FRONTEND/node_modules" ]; then
  echo "==> First run: installing frontend deps (npm install) ..."
  ( cd "$FRONTEND" && npm install )
fi

# --- start backend ----------------------------------------------------------
echo "==> Starting backend on http://$DJANGO_BIND ..."
( cd "$BACKEND" && exec "$VENV_PY" manage.py runserver "$DJANGO_BIND" ) &
DJANGO_PID=$!

cleanup() {
  local pid_file_path="${PID_FILE:-$ROOT/.run/serve.pids}"

  echo ""
  echo "==> Stopping servers ..."
  kill "$DJANGO_PID" 2>/dev/null || true
  [ -n "${VITE_PID:-}" ] && kill "$VITE_PID" 2>/dev/null || true
  rm -f "$pid_file_path"
}
trap cleanup EXIT INT TERM

# wait for backend to answer (probe localhost — it's on this machine)
for _ in $(seq 1 20); do
  curl -fsS http://127.0.0.1:8000/ >/dev/null 2>&1 && break
  sleep 1
done
if curl -fsS http://127.0.0.1:8000/ >/dev/null 2>&1; then
  echo "==> Backend is up."
else
  echo "==> WARNING: backend did not respond yet; continuing anyway."
fi

# --- start frontend ---------------------------------------------------------
# Pick the first free port at or above 5173 so the launcher still succeeds if
# 5173 is busy from another dev server.
VITE_PORT="$(find_free_port 5173)"
echo "==> Starting frontend on http://$LAN_IP:$VITE_PORT ..."
( cd "$FRONTEND" && exec npm run dev -- --host --port "$VITE_PORT" ) &
VITE_PID=$!

echo ""
echo "-------------------------------------------------------------------"
echo "  Dashboard:  http://$LAN_IP:$VITE_PORT"
if [ "${LAN:-1}" = "1" ]; then
  echo "  From other PCs on this network, open the SAME URL above."
  echo "  (If they can't connect, allow ports $VITE_PORT + 8000 in this PC's firewall.)"
fi
echo "  Shows THIS computer's live stats. Ctrl-C stops both servers."
echo "-------------------------------------------------------------------"

pid_file_path="${PID_FILE:-$ROOT/.run/serve.pids}"
cat >"$pid_file_path" <<EOF
ROOT=$ROOT
BACKEND_PID=$DJANGO_PID
VITE_PID=$VITE_PID
EOF

wait "$VITE_PID"
