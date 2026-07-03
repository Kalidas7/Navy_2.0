#!/usr/bin/env python3
"""
Live host-metrics monitor — an nvtop/htop-style terminal view of the SAME data
the website shows. It calls the identical ``fleet.sysmetrics.snapshot()`` that
the Django ``/api/system`` endpoint serves, so every number here matches a value
on the web dashboard 1:1. Use it to VERIFY the website against the real machine.

Run:
    cd ~/Music/Navy_3d/backend
    .venv/bin/python realtime/live_stats.py                 # CPU/RAM/etc (GPU shows "off")
    NAVY_ENABLE_GPU=1 .venv/bin/python realtime/live_stats.py   # include Intel GPU

Refreshes every second. Ctrl-C to quit.

Each row is labelled with WHERE it appears on the website, so you can match them:
    CPU LOAD  -> SYSTEM panel / home card
    FAN       -> COOLING FANS panel / bottom dock
    DISK IOPS -> DRIVE BAY panel
    GPU BUSY  -> POWER UNIT panel
    etc.
"""
import os
import sys
import time

# This script lives in backend/realtime/; add the parent (backend/) to the path
# so `fleet` resolves regardless of the current working directory.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from fleet import sysmetrics  # noqa: E402

# ── ANSI styling ──────────────────────────────────────────────────────────
CLR = "\033[2J\033[H"
B = "\033[1m"
DIM = "\033[2m"
R = "\033[0m"
GRN = "\033[32m"
YEL = "\033[33m"
RED = "\033[31m"
CYN = "\033[36m"
MAG = "\033[35m"


def bar(pct, width=26):
    """A colored [████░░░░] gauge with green/amber/red thresholds."""
    pct = max(0.0, min(100.0, float(pct or 0)))
    fill = int(round(pct / 100 * width))
    col = GRN if pct < 70 else YEL if pct < 90 else RED
    return f"{col}{'█' * fill}{DIM}{'░' * (width - fill)}{R}"


def row(label, gauge, value, where):
    """label │ gauge │ value │ (where it shows on the website)."""
    return f"  {label:<11}{gauge}  {B}{value:<16}{R}{DIM}{where}{R}"


def sect(title):
    return f"\n{B}{CYN}── {title} {'─' * (52 - len(title))}{R}"


def render(m):
    c, mem, dk, net = m["cpu"], m["mem"], m["disk"], m["net"]
    out = [
        f"{CLR}{B}{MAG} LIVE HOST DATA — {m['host']}{R}   "
        f"{DIM}uptime {m['uptime']} · refresh 1s · Ctrl-C to quit{R}",
        f"{DIM}   Every value below is exactly what the website receives from "
        f"/api/system.{R}",
    ]

    # ── CPU ──
    out.append(sect("CPU"))
    out.append(row("CPU LOAD", bar(c["pct"]), f"{c['pct']:.1f} %",
                   "→ SYSTEM panel · home card"))
    freq = f"{c['freqMhz']}/{c['freqMaxMhz']} MHz" if c["freqMhz"] else "—"
    out.append(f"  {DIM}freq {freq} · load {c['load']} · {c['cores']} threads{R}")
    if c["tempC"] is not None:
        out.append(row("CPU TEMP", bar((c["tempC"] / 100) * 100), f"{c['tempC']} °C",
                       "→ CORE TEMP (SYSTEM panel)"))

    # ── Memory ──
    out.append(sect("MEMORY"))
    out.append(row("RAM", bar(mem["pct"]),
                   f"{mem['pct']:.1f} %", f"→ MEMORY panel  ({mem['usedGb']}/{mem['totalGb']} GB)"))
    out.append(row("SWAP", bar(mem["swapPct"]), f"{mem['swapPct']:.1f} %", ""))

    # ── Disk ──
    out.append(sect("DISK"))
    out.append(row("DISK USAGE", bar(dk["pct"]),
                   f"{dk['pct']:.1f} %", f"→ DISK USAGE  ({dk['usedGb']}/{dk['totalGb']} GB)"))
    out.append(f"  {DIM}DISK IOPS {R}{B}{dk['iops']:.0f}{R}"
               f"{DIM}  ops/s   → DRIVE BAY panel (0 when idle, spikes on read/write){R}")
    out.append(f"  {DIM}DISK I/O  {R}R {B}{dk['readMbps']:.2f}{R} MB/s   "
               f"W {B}{dk['writeMbps']:.2f}{R} MB/s   {DIM}→ DISK I/O card{R}")

    # ── Network ──
    out.append(sect("NETWORK"))
    out.append(f"  {DIM}DOWN ↓ {R}{B}{net['rxMbps']:.2f}{R} Mb/s   "
               f"{DIM}UP ↑ {R}{B}{net['txMbps']:.2f}{R} Mb/s   "
               f"{DIM}{net['rxPps']}+{net['txPps']} pkt/s  → NETWORK panel · NET dock{R}")

    # ── Cooling / Power ──
    out.append(sect("COOLING & POWER"))
    fan = f"{m['fanRpm']} RPM" if m["fanRpm"] else "—"
    out.append(row("FAN", "", fan, "→ COOLING FANS panel · FAN dock"))
    if m.get("powerW") is not None:
        out.append(row("POWER", "", f"{m['powerW']} W",
                       "→ POWER panel (REAL, from Intel RAPL)"))
    else:
        est = round(8 + c["pct"] / 100 * 32 + ((m["gpu"] or {}).get("powerW") or 0))
        out.append(row("EST POWER", "", f"~{est} W",
                       "→ EST. POWER (estimate; enable RAPL for real)"))
    g = m["gpu"]
    if g:
        busy = f"{g['busyPct']} %" if g["busyPct"] is not None else "—"
        out.append(row("GPU BUSY", bar(g["busyPct"] or 0), busy,
                       "→ GPU BUSY (POWER panel)"))
    else:
        gpu_on = os.environ.get("NAVY_ENABLE_GPU") == "1"
        note = "warming up…" if gpu_on else "off (run with NAVY_ENABLE_GPU=1)"
        out.append(row("GPU BUSY", "", "—", f"→ GPU {note}"))
    if m["battery"]:
        b = m["battery"]
        plug = "⚡ charging" if b["plugged"] else "on battery"
        out.append(row("BATTERY", bar(b["percent"]), f"{b['percent']} %  {plug}",
                       "→ BATTERY (POWER panel)"))

    # ── Top processes (like htop) ──
    out.append(sect("TOP PROCESSES (by CPU)"))
    out.append(f"  {DIM}{'CPU%':>6} {'MEM%':>6}  {'PID':<8}NAME{R}")
    for p in m["topCpu"]:
        out.append(f"  {p['cpu']:>6.1f} {p['mem']:>6.1f}  {DIM}{p['pid']:<8}{R}{p['name']}")

    return "\n".join(out)


def main():
    sysmetrics.snapshot()  # prime rate deltas + start GPU poller
    time.sleep(1)
    try:
        while True:
            print(render(sysmetrics.snapshot()), flush=True)
            time.sleep(1)
    except KeyboardInterrupt:
        print(R + "\nbye.")


if __name__ == "__main__":
    main()
