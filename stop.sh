#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$ROOT/.run/serve.pids"

stop_pid() {
  local pid="$1"
  local label="$2"

  if [ -z "$pid" ] || ! kill -0 "$pid" 2>/dev/null; then
    return 0
  fi

  echo "==> Stopping $label ($pid) ..."
  kill "$pid" 2>/dev/null || true

  for _ in $(seq 1 10); do
    if ! kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
    sleep 1
  done

  echo "==> $label did not exit cleanly; forcing shutdown ..."
  kill -9 "$pid" 2>/dev/null || true
}

if [ -f "$PID_FILE" ]; then
  # shellcheck disable=SC1090
  . "$PID_FILE"
  stop_pid "${VITE_PID:-}" "frontend"
  stop_pid "${BACKEND_PID:-}" "backend"
  rm -f "$PID_FILE"
  echo "==> Done."
  exit 0
fi

echo "==> No saved PID file found; scanning for project processes on ports 5173 and 8000 ..."

PORT_PIDS=""
if command -v lsof >/dev/null 2>&1; then
  PORT_PIDS="$(
    {
      lsof -ti :5173 2>/dev/null || true
      lsof -ti :8000 2>/dev/null || true
    } | sort -u
  )"
fi

if [ -z "${PORT_PIDS:-}" ]; then
  echo "==> Nothing to stop."
  exit 0
fi

for pid in $PORT_PIDS; do
  cmdline="$(ps -p "$pid" -o command= 2>/dev/null || true)"
  case "$cmdline" in
    *"$ROOT"*|*"manage.py runserver"*|*"vite"*)
      stop_pid "$pid" "project process"
      ;;
  esac
done

echo "==> Done."