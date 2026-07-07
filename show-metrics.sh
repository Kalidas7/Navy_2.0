#!/usr/bin/env bash
#
# show-metrics.sh — dump the SAME live telemetry the website shows, as tables,
# straight from the backend API, so you can cross-check the UI against the source.
#
#   ./show-metrics.sh                 # localhost backend (127.0.0.1:8000)
#   API=http://192.168.135.56:8000 ./show-metrics.sh   # LAN backend
#   ./show-metrics.sh --watch         # refresh every 2s (like the live UI)
#
# Requires: curl + python3 (both already used by the project). The backend must
# be running — start it with ./run-local.sh or start.bat first.

API="${API:-http://127.0.0.1:8000}"
RACK="${RACK:-localhost-2}"

dump() {
  python3 - "$API" "$RACK" <<'PY'
import json, sys, urllib.request

api, rack = sys.argv[1], sys.argv[2]

def get(path):
    try:
        with urllib.request.urlopen(f"{api}{path}", timeout=6) as r:
            return json.load(r)
    except Exception as e:
        print(f"  ! could not reach {api}{path} — {e}")
        return None

def table(rows, headers):
    """Minimal fixed-width table printer."""
    cols = list(zip(*([headers] + rows))) if rows else [[h] for h in headers]
    widths = [max(len(str(c)) for c in col) for col in cols]
    line = lambda cells: "  " + " | ".join(str(c).ljust(w) for c, w in zip(cells, widths))
    print(line(headers))
    print("  " + "-+-".join("-" * w for w in widths))
    for r in rows:
        print(line(r))

# ---- scalar snapshot (summary cards + telemetry dock) ----
def fmt(v, suffix=""):
    return "—" if v is None else f"{v}{suffix}"

s = get("/api/system")
if s:
    cpu, mem, disk, net = (s.get(k) or {} for k in ("cpu", "mem", "disk", "net"))
    bat = s.get("battery") or {}
    load = cpu.get("load") or []
    print("\n=== SYSTEM (summary cards / telemetry dock) ===")
    rows = [
        ("CPU %",         fmt(cpu.get("pct"), "%")),
        ("CPU TEMP °C",   fmt(cpu.get("tempC"), "°C")),
        ("CPU FREQ MHz",  fmt(cpu.get("freqMhz"))),
        ("LOAD AVG",      " · ".join(str(x) for x in load) if load else "—"),
        ("MEM %",         fmt(mem.get("pct"), "%")),
        ("MEM USED/TOTAL", f'{fmt(mem.get("usedGb"))} / {fmt(mem.get("totalGb"))} GB'),
        ("DISK %",        fmt(disk.get("pct"), "%")),
        ("DISK IOPS",     fmt(disk.get("iops"))),
        ("NET ↑ Mb/s",    fmt(net.get("txMbps"))),
        ("NET ↓ Mb/s",    fmt(net.get("rxMbps"))),
        ("FAN RPM",       fmt(s.get("fanRpm"))),
        ("PWR DRAW W",    fmt(s.get("powerW"))),
        ("BATTERY %",     fmt(bat.get("percent"), "%") + (" (AC)" if bat.get("plugged") else "")),
        ("GPU BUSY %",    fmt((s.get("gpu") or {}).get("busyPct") if s.get("gpu") else None)),
        ("UPTIME",        fmt(s.get("uptime"))),
    ]
    table(rows, ["METRIC", "VALUE"])

    if s.get("topCpu"):
        print("\n=== TOP PROCESSES (by CPU) ===")
        table([(p["pid"], p["name"], f'{p["cpu"]}%', f'{p["mem"]}%') for p in s["topCpu"]],
              ["PID", "NAME", "CPU", "MEM"])

# ---- per-device components (detail panels) ----
c = get(f"/api/racks/{rack}/components")
if c:
    if c.get("statusItems"):
        print("\n=== STATUS ARRAY (subsystem health) ===")
        table([(i["name"], i["state"]) for i in c["statusItems"]], ["SUBSYSTEM", "STATE"])

    if c.get("driveBays"):
        print("\n=== DRIVE BAY ===")
        table([(d["id"], f'{d["used"]}%', f'{d.get("temp","—")}°C') for d in c["driveBays"]],
              ["DISK", "USED", "TEMP"])

    if c.get("netPorts"):
        print("\n=== NETWORK PORTS ===")
        table([(n["id"], n.get("state","—"),
                f'↑{n.get("out","—")}', f'↓{n.get("in","—")}') for n in c["netPorts"]],
              ["NIC", "STATE", "EGRESS", "INGRESS"])

    if c.get("fans"):
        print("\n=== COOLING FANS ===")
        table([(f["id"], f'{f["rpm"]} RPM' if f.get("rpm") else "IDLE") for f in c["fans"]],
              ["FAN", "SPEED"])

    if c.get("psuMods"):
        print("\n=== POWER UNIT ===")
        table([(m["id"], m.get("state","—"), f'{m.get("volt","—")}') for m in c["psuMods"]],
              ["MODULE", "STATE", "CHARGE/V"])
PY
}

if [ "$1" = "--watch" ]; then
  while true; do
    clear
    echo "NDS-CMS live metrics — $API — $(date '+%H:%M:%S')  (Ctrl-C to stop)"
    dump
    sleep 2
  done
else
  echo "NDS-CMS live metrics — $API"
  dump
fi
