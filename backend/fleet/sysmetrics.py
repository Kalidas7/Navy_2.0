"""
Real host-machine metrics sampler.

Unlike ``data.py`` (which serves the fleet's identity rows — the real localhost
rack plus empty INS shells), this module reads the *actual* machine the backend
runs on via ``psutil`` and a couple of ``/sys`` / CLI fallbacks. It is the single
source of truth for the live ``/api/system`` endpoints, the localhost rack's real
per-device components, and the real host log feed.

Design notes:
  * Rates (disk I/O, network throughput) are deltas between successive samples,
    so a module-level ``_Sampler`` singleton keeps the previous counters. The
    first sample after startup reports 0 rates (no prior baseline) — expected.
  * Everything is best-effort: any sensor a given machine doesn't expose comes
    back as ``None`` rather than raising, so one missing reading never breaks
    the whole snapshot. The frontend renders ``None`` as "—".
  * GPU is Intel-iGPU best-effort via ``intel_gpu_top`` and is OFF by default
    because it typically needs root; see ``read_intel_gpu``.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import threading
import time
from typing import Any

import psutil

# ---------------------------------------------------------------------------
# Temperature / fan source selection
# ---------------------------------------------------------------------------
# psutil.sensors_temperatures() returns a dict keyed by chip. We prefer a CPU
# package reading; the label varies by platform, so try a priority list.
_CPU_TEMP_CHIPS = ("coretemp", "k10temp", "cpu_thermal", "acpitz", "dell_smm")


def _cpu_temp() -> float | None:
    try:
        temps = psutil.sensors_temperatures()
    except (AttributeError, OSError):
        return None
    if not temps:
        return None
    # Prefer a package/Tctl reading from a known CPU chip.
    for chip in _CPU_TEMP_CHIPS:
        entries = temps.get(chip)
        if not entries:
            continue
        for e in entries:
            label = (e.label or "").lower()
            if "package" in label or "tctl" in label or "tccd" in label:
                return round(e.current, 1)
        # No explicit package label — take the hottest core on that chip.
        return round(max(e.current for e in entries), 1)
    # Fall back to the hottest reading anywhere.
    allvals = [e.current for entries in temps.values() for e in entries if e.current]
    return round(max(allvals), 1) if allvals else None


def _fan_rpm() -> int | None:
    try:
        fans = psutil.sensors_fans()
    except (AttributeError, OSError):
        return None
    if not fans:
        return None
    # Keep 0 readings: a present-but-stopped fan reports current=0 and must stay
    # distinct from "no fan sensor at all" (empty -> None). Filter only missing
    # (None) values, not idle ones.
    vals = [f.current for entries in fans.values() for f in entries if f.current is not None]
    return int(max(vals)) if vals else None


def _fmt_uptime(seconds: float) -> str:
    s = int(seconds)
    d, s = divmod(s, 86400)
    h, s = divmod(s, 3600)
    m, _ = divmod(s, 60)
    if d:
        return f"{d}d {h}h {m}m"
    if h:
        return f"{h}h {m}m"
    return f"{m}m"


# Palette mirrors the frontend tokens (light theme) so real-component payloads
# match the UI. Values track config/tokens.ts: status green/amber/red, the blue
# accent, and the neutral standby steel.
_GREEN = "#16a34a"
_AMBER = "#d97706"
_RED = "#dc2626"
_BLUE = "#2563eb"
_STEEL = "#64748b"


def _health_color(pct: float, warn: float = 80, crit: float = 92) -> str:
    return _RED if pct >= crit else _AMBER if pct >= warn else _GREEN


def _real_disks() -> list[dict[str, Any]]:
    """
    Real fixed disks as "drive bays". One entry per physical disk (loop/snap
    pseudo-devices are skipped). Usage is per-mount; temp is the NVMe composite
    from sensors when available.
    """
    # A representative NVMe/disk temperature, if the chip exposes one.
    disk_temp = None
    try:
        temps = psutil.sensors_temperatures()
        for chip in ("nvme", "drivetemp", "sdd"):
            for e in temps.get(chip, []):
                if e.current:
                    disk_temp = round(e.current)
                    break
            if disk_temp is not None:
                break
    except (AttributeError, OSError):
        pass

    bays: list[dict[str, Any]] = []
    seen: set[str] = set()
    try:
        parts = psutil.disk_partitions(all=False)
    except OSError:
        parts = []
    for p in parts:
        dev = p.device
        # Skip snap/loop pseudo-filesystems and anything non-physical.
        if "loop" in dev or p.fstype in ("squashfs", "") or dev in seen:
            continue
        seen.add(dev)
        try:
            u = psutil.disk_usage(p.mountpoint)
        except OSError:
            continue
        pct = round(u.percent)
        bays.append(
            {
                # Friendly name based on what the partition is used for.
                "id": _friendly_disk_name(p.mountpoint, dev),
                "used": pct,
                "temp": disk_temp if disk_temp is not None else 0,
                "color": _health_color(pct),
            }
        )
    return bays


def _friendly_disk_name(mountpoint: str, dev: str) -> str:
    """Human label for a disk partition based on its mount point."""
    m = mountpoint.rstrip("/") or "/"
    if mountpoint == "/":
        return "Main Disk"
    if "efi" in mountpoint.lower() or mountpoint.startswith("/boot"):
        return "Boot (EFI)"
    if mountpoint.startswith("/home"):
        return "Home"
    # Fall back to the mount point's last segment, else the raw device.
    tail = m.rsplit("/", 1)[-1]
    return tail.capitalize() if tail else dev.rsplit("/", 1)[-1].upper()


def _real_fans() -> list[dict[str, Any]]:
    """Every real fan the machine exposes, with true RPM (empty if none)."""
    out: list[dict[str, Any]] = []
    try:
        fans = psutil.sensors_fans()
    except (AttributeError, OSError):
        return out
    idx = 1
    for chip, entries in (fans or {}).items():
        for e in entries:
            rpm = int(e.current or 0)
            # Spin animation speed: faster rpm -> quicker spin (bounded).
            spin = round(max(0.4, 3.5 - rpm / 2500), 2)
            out.append(
                {
                    "id": e.label or f"FAN-{idx}",
                    "rpm": rpm,
                    "spin": spin,
                    "color": _GREEN if rpm > 0 else _STEEL,
                }
            )
            idx += 1
    return out


def _friendly_nic_name(name: str) -> str:
    """
    Human label for a Linux interface. systemd predictable names encode the
    type in their prefix: en*=Ethernet, wl*=Wi-Fi, ww*=Mobile, br*=Bridge,
    docker/veth/virbr=Virtual, tun/tap=VPN.
    """
    n = name.lower()
    if n.startswith(("en", "eth")):
        return "Ethernet"
    if n.startswith(("wl", "wlan", "wlp")):
        return "Wi-Fi"
    if n.startswith("ww"):
        return "Mobile"
    if n.startswith(("docker", "veth", "virbr", "br")):
        return "Virtual"
    if n.startswith(("tun", "tap")):
        return "VPN"
    return name


# Per-NIC throughput needs deltas between successive /components calls. Reading
# /proc/net/dev via psutil is the same cheap syscall the system-wide net counter
# already uses, so measuring real per-interface rates adds essentially no load.
# Cache: iface -> (bytes_recv, bytes_sent, monotonic_ts) from the previous call.
_prev_nic: dict[str, tuple[int, int, float]] = {}


def _fmt_rate_mbps(bytes_per_s: float) -> str:
    """Bytes/s → a compact bits-per-second label (Kb/s or Mb/s)."""
    mbps = bytes_per_s * 8 / 1e6
    if mbps < 1:
        return f"{mbps * 1000:.0f} Kb/s"
    return f"{mbps:.1f} Mb/s"


def _real_nics() -> list[dict[str, Any]]:
    """
    Real network interfaces (loopback + virtual excluded) with link state and
    live per-interface up/down throughput (deltas vs. the previous call).
    """
    out: list[dict[str, Any]] = []
    try:
        stats = psutil.net_if_stats()
        io = psutil.net_io_counters(pernic=True)
    except OSError:
        return out
    now = time.monotonic()
    for name, st in stats.items():
        # Skip loopback and virtual bridges/containers — show real NICs only.
        if name == "lo" or name.startswith(("docker", "veth", "virbr", "br-")):
            continue

        # Live up/down rate from the byte-counter delta since the last call.
        rx_txt = tx_txt = "—"
        counters = io.get(name)
        if counters is not None:
            prev = _prev_nic.get(name)
            if prev is not None:
                dt = max(now - prev[2], 1e-3)
                rx_bps = (counters.bytes_recv - prev[0]) / dt
                tx_bps = (counters.bytes_sent - prev[1]) / dt
                # Only report a rate for links that are up; guard counter resets.
                if st.isup and rx_bps >= 0 and tx_bps >= 0:
                    rx_txt = _fmt_rate_mbps(rx_bps)
                    tx_txt = _fmt_rate_mbps(tx_bps)
            _prev_nic[name] = (counters.bytes_recv, counters.bytes_sent, now)

        speed = f"{st.speed} Mb/s" if st.speed else "—"
        out.append(
            {
                # e.g. "Wi-Fi (wlp0s20f3)" — friendly name + raw for reference.
                "id": f"{_friendly_nic_name(name)} ({name})",
                "speed": speed,
                "state": "LINK UP" if st.isup else "DOWN",
                "in": rx_txt,
                "out": tx_txt,
                "color": _GREEN if st.isup else _STEEL,
            }
        )
    return out


def _real_power() -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """
    Power modules + rails from real sensors. On a laptop the 'PSU module' is the
    battery/AC; 'rails' are repurposed to show battery %, CPU load, and mem load.
    """
    mods: list[dict[str, Any]] = []
    try:
        bat = psutil.sensors_battery()
    except (AttributeError, OSError):
        bat = None
    if bat is not None:
        mods.append(
            {
                "id": "BATTERY",
                "volt": round(bat.percent, 1),  # % here, not volts (no volt sensor)
                "load": round(bat.percent),
                "temp": 0,
                "state": "AC / CHARGING" if bat.power_plugged else "ON BATTERY",
                "color": _GREEN if bat.power_plugged or bat.percent > 20 else _RED,
            }
        )

    cpu = psutil.cpu_percent(interval=None)
    mem = psutil.virtual_memory().percent
    rails = [
        {"name": "BATTERY", "pct": round(bat.percent) if bat else 0, "color": _GREEN},
        {"name": "CPU", "pct": round(cpu), "color": _BLUE},
        {"name": "MEM", "pct": round(mem), "color": _STEEL},
    ]
    return mods, rails


def _real_status_items() -> list[dict[str, Any]]:
    """Subsystem health list built from real load/thermal readings."""
    items: list[dict[str, Any]] = []

    def add(name: str, ok: bool, warn: bool = False) -> None:
        state = "CRITICAL" if not ok and not warn else "WARNING" if warn else "NOMINAL"
        color = _RED if state == "CRITICAL" else _AMBER if state == "WARNING" else _GREEN
        items.append({"name": name, "state": state, "color": color})

    cpu = psutil.cpu_percent(interval=None)
    mem = psutil.virtual_memory().percent
    temp = _cpu_temp() or 0
    try:
        du = psutil.disk_usage("/").percent
    except OSError:
        du = 0
    add("CPU", cpu < 90, warn=cpu >= 75)
    add("Memory", mem < 92, warn=mem >= 80)
    add("Thermals", temp < 90, warn=temp >= 80)
    add("Disk", du < 95, warn=du >= 85)
    add("Network", any(s.isup for n, s in psutil.net_if_stats().items() if n != "lo"))
    return items


def host_components() -> dict[str, Any]:
    """
    Real per-device component payload for the localhost rack, in the frontend's
    CompData shape. Only devices that actually exist are listed — no fabricated
    bays/fans/PSUs, and no sonar contacts.
    """
    mods, rails = _real_power()
    # Sort device lists by id so the order is stable across the frontend's 5s
    # component poll — otherwise non-deterministic psutil enumeration could make
    # keyed rows (disks/fans/NICs) visibly reshuffle each refresh.
    return {
        "driveBays": sorted(_real_disks(), key=lambda x: x["id"]),
        "fans": sorted(_real_fans(), key=lambda x: x["id"]),
        "netPorts": sorted(_real_nics(), key=lambda x: x["id"]),
        "psuMods": mods,
        "psuRails": rails,
        "statusItems": _real_status_items(),
        "contacts": [],  # no radar/sonar on a real host
    }


# ---------------------------------------------------------------------------
# Real system logs (host journal)
# ---------------------------------------------------------------------------
# The LOGS tab shows the machine's ACTUAL recent log lines. On systemd hosts we
# read the journal (``journalctl -o json``), which works unprivileged for the
# current user's session/system messages and carries a real syslog PRIORITY per
# line. Where journalctl is unavailable we tail ``/var/log/syslog``. Nothing is
# fabricated: if neither source is readable we return an empty list and the UI
# renders "NO LOG SOURCE".

# syslog PRIORITY (0..7) → the frontend's four log levels + palette color.
# 0 emerg · 1 alert · 2 crit · 3 err → CRIT; 4 warning → WARN; 5 notice /
# 6 info → INFO; 7 debug → INFO. Mirrors config/tokens log colors.
_LOG_LEVEL_BY_PRIORITY = {
    0: "CRIT", 1: "CRIT", 2: "CRIT", 3: "CRIT",
    4: "WARN", 5: "INFO", 6: "INFO", 7: "INFO",
}
_LOG_COLORS = {"OK": _GREEN, "INFO": "#3b82f6", "WARN": _AMBER, "CRIT": _RED}


def _clock_from_epoch_us(us: int) -> str:
    """HH:MM:SS from a microseconds-since-epoch journal timestamp (local time)."""
    lt = time.localtime(us / 1_000_000)
    return time.strftime("%H:%M:%S", lt)


def _logs_from_journalctl(limit: int) -> list[dict[str, Any]]:
    """Recent journal entries as LogEntry dicts, newest last. [] if unavailable."""
    if shutil.which("journalctl") is None:
        return []
    try:
        out = subprocess.run(
            ["journalctl", "-n", str(limit), "--no-pager", "-o", "json"],
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            timeout=4,
        ).stdout
    except (OSError, subprocess.SubprocessError):
        return []

    entries: list[dict[str, Any]] = []
    for i, line in enumerate(out.splitlines()):
        line = line.strip()
        if not line:
            continue
        try:
            o = json.loads(line)
        except json.JSONDecodeError:
            continue
        msg = o.get("MESSAGE")
        if isinstance(msg, list):  # binary messages arrive as byte arrays
            continue
        if not msg:
            continue
        try:
            prio = int(o.get("PRIORITY", 6))
        except (TypeError, ValueError):
            prio = 6
        lvl = _LOG_LEVEL_BY_PRIORITY.get(prio, "INFO")
        try:
            ts = _clock_from_epoch_us(int(o.get("__REALTIME_TIMESTAMP", 0)))
        except (TypeError, ValueError):
            ts = ""
        ident = o.get("SYSLOG_IDENTIFIER") or o.get("_COMM")
        text = f"{ident}: {msg}" if ident else str(msg)
        entries.append({
            "id": f"jl{i}",
            "t": ts,
            "lvl": lvl,
            "msg": text[:160],
            "color": _LOG_COLORS[lvl],
        })
    return entries


def _logs_from_syslog(limit: int) -> list[dict[str, Any]]:
    """Fallback: tail /var/log/syslog. Levels aren't tagged, so default INFO."""
    try:
        with open("/var/log/syslog", "r", errors="replace") as fh:
            lines = fh.readlines()[-limit:]
    except OSError:
        return []
    entries: list[dict[str, Any]] = []
    for i, raw in enumerate(lines):
        raw = raw.rstrip("\n")
        if not raw:
            continue
        low = raw.lower()
        lvl = "CRIT" if ("error" in low or "fail" in low) else "WARN" if "warn" in low else "INFO"
        entries.append({
            "id": f"sl{i}",
            "t": "",
            "lvl": lvl,
            "msg": raw[:160],
            "color": _LOG_COLORS[lvl],
        })
    return entries


def host_logs(limit: int = 40) -> list[dict[str, Any]]:
    """
    Real recent host log lines in the frontend's LogEntry shape (newest last).

    Tries the systemd journal first, then /var/log/syslog. Returns [] when no
    source is readable — never fabricates entries.
    """
    entries = _logs_from_journalctl(limit)
    if not entries:
        entries = _logs_from_syslog(limit)
    return entries


def _extract_gpu(obj: dict[str, Any]) -> dict[str, Any] | None:
    """Pull busy% + power from one parsed intel_gpu_top frame object."""
    if not isinstance(obj, dict):
        return None
    # engines key varies by version: "Render/3D", "Render/3D/0", etc.
    engines = obj.get("engines", {})
    busy = None
    for name, eng in engines.items():
        if "Render" in name or "3D" in name:
            busy = eng.get("busy")
            break
    if busy is None and engines:
        # No render engine matched — fall back to the busiest engine.
        busy = max((e.get("busy", 0) for e in engines.values()), default=None)

    # busy is a percentage (0–100). intel_gpu_top's FIRST frame after startup
    # has no time baseline yet and can report a wildly wrong value (e.g. 3061%);
    # reject anything outside a sane band rather than clamp it to a fake 100%.
    if busy is not None and not (0 <= busy <= 100):
        busy = None

    power = obj.get("power", {})
    power_w = power.get("GPU") if isinstance(power, dict) else None
    if busy is None and power_w is None:
        return None
    return {
        "busyPct": round(busy, 1) if busy is not None else None,
        "powerW": round(power_w, 2) if power_w is not None else None,
    }


class _GpuPoller:
    """
    Background reader for Intel iGPU stats.

    ``intel_gpu_top`` is meant to run as one long-lived process that streams a
    JSON array of frames. Spawning it per-sample would block the metrics loop
    for seconds, so instead we run it once in a daemon thread, incrementally
    parse each frame as it arrives, and cache the latest. ``latest()`` is a
    non-blocking read used by the snapshot path.

    Enabled only when ``NAVY_ENABLE_GPU=1`` and ``intel_gpu_top`` is on PATH.
    Any failure (missing tool, permission denied) leaves ``latest()`` == None
    forever, which the frontend renders as "—". Never raises.
    """

    def __init__(self) -> None:
        self._latest: dict[str, Any] | None = None
        self._lock = threading.Lock()
        self._started = False

    def _enabled(self) -> bool:
        return (
            os.environ.get("NAVY_ENABLE_GPU") == "1"
            and shutil.which("intel_gpu_top") is not None
        )

    def start(self) -> None:
        if self._started or not self._enabled():
            return
        self._started = True
        t = threading.Thread(target=self._run, name="intel-gpu-top", daemon=True)
        t.start()

    def _run(self) -> None:
        # intel_gpu_top block-buffers stdout when it isn't a TTY: with a plain
        # pipe the first frame doesn't appear until ~4KB accumulates (seconds of
        # lag). `stdbuf -oL` forces line buffering so each frame flushes at once.
        base = ["intel_gpu_top", "-J", "-s", "1000", "-o", "-"]
        cmd = (["stdbuf", "-oL"] + base) if shutil.which("stdbuf") else base
        try:
            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                text=True,
                bufsize=1,
            )
        except OSError:
            return
        # Accumulate the streamed text and pull out each top-level JSON object
        # with json.raw_decode — it correctly handles nested braces and braces
        # inside strings (a hand-rolled brace counter does not). We read
        # line-by-line via readline(); `for line in proc.stdout` adds a
        # read-ahead buffer that won't yield until it fills, stalling for
        # seconds when intel_gpu_top emits only ~one frame per second.
        decoder = json.JSONDecoder()
        buf = ""
        assert proc.stdout is not None
        while True:
            line = proc.stdout.readline()
            if line == "":  # EOF: process exited
                break
            buf += line
            # Skip whitespace and the array framing punctuation ('[', ',') that
            # sits between objects, then try to decode one object at the front.
            while buf:
                stripped = buf.lstrip(" \t\r\n[],")
                if not stripped:
                    buf = ""
                    break
                if not stripped.startswith("{"):
                    # Junk we don't recognise (e.g. a stray token) — drop a char
                    # and retry so we can't wedge on it.
                    buf = stripped[1:]
                    continue
                try:
                    obj, end = decoder.raw_decode(stripped)
                except json.JSONDecodeError:
                    # Object not fully arrived yet; keep the remainder and wait
                    # for more lines.
                    buf = stripped
                    break
                buf = stripped[end:]
                g = _extract_gpu(obj)
                if g is not None:
                    with self._lock:
                        self._latest = g
            # Guard against unbounded growth from a never-closing object.
            if len(buf) > 65536:
                buf = ""
        proc.stdout.close()

    def latest(self) -> dict[str, Any] | None:
        with self._lock:
            return self._latest


_gpu_poller = _GpuPoller()


def read_intel_gpu() -> dict[str, Any] | None:
    """
    Latest cached Intel iGPU stats (non-blocking).

    Lazily starts the background poller on first call. Returns
    ``{"busyPct": float | None, "powerW": float | None}`` once frames arrive,
    or ``None`` until then / when disabled.

    To enable GPU:
        sudo apt install intel-gpu-tools
        # let intel_gpu_top read perf counters without root:
        sudo setcap cap_perfmon+ep $(which intel_gpu_top)
        # then run the backend normally with NAVY_ENABLE_GPU=1
    """
    _gpu_poller.start()
    return _gpu_poller.latest()


# ---------------------------------------------------------------------------
# Real power via Intel RAPL
# ---------------------------------------------------------------------------
# RAPL exposes a monotonic energy counter (microjoules) per power domain under
# /sys/class/powercap. Power(W) = delta_energy_uj / 1e6 / delta_seconds. We
# prefer the "psys" domain (whole SoC/platform) when present, else "package-0"
# (CPU package). Needs read access to energy_uj (root by default) — grant with:
#   sudo chmod -R a+r /sys/class/powercap/intel-rapl:*/energy_uj
# If unreadable, powerW is None and the frontend falls back to its estimate.
import glob  # noqa: E402


def _rapl_domain_path() -> str | None:
    """Path to the best top-level RAPL energy counter, or None if unavailable."""
    best_pkg = None
    for d in sorted(glob.glob("/sys/class/powercap/intel-rapl:*/")):
        base = os.path.basename(d.rstrip("/"))
        # Only top-level domains (intel-rapl:N), not subzones (intel-rapl:N:M).
        if base.count(":") != 1:
            continue
        energy = os.path.join(d, "energy_uj")
        if not os.access(energy, os.R_OK):
            continue
        try:
            name = open(os.path.join(d, "name")).read().strip()
        except OSError:
            name = ""
        if name == "psys":  # whole-platform power — the best single number
            return energy
        if name.startswith("package"):
            best_pkg = energy
    return best_pkg


def _read_rapl_uj(path: str) -> int | None:
    try:
        return int(open(path).read())
    except (OSError, ValueError):
        return None


class _Sampler:
    """Holds previous counters so throughput/IOPS can be computed as deltas."""

    def __init__(self) -> None:
        self._prev_disk = psutil.disk_io_counters()
        self._prev_net = psutil.net_io_counters()
        self._prev_t = time.monotonic()
        # RAPL real-power baseline (None if the counter isn't readable).
        self._rapl_path = _rapl_domain_path()
        self._prev_rapl = _read_rapl_uj(self._rapl_path) if self._rapl_path else None
        # Prime cpu_percent so the first real call returns a meaningful value.
        psutil.cpu_percent(interval=None)
        psutil.cpu_percent(interval=None, percpu=True)

    def sample(self) -> dict[str, Any]:
        now = time.monotonic()
        dt = max(now - self._prev_t, 1e-3)

        # --- CPU ---
        cpu_pct = psutil.cpu_percent(interval=None)
        per_core = psutil.cpu_percent(interval=None, percpu=True)
        freq = psutil.cpu_freq()
        try:
            load1, load5, load15 = os.getloadavg()
        except (OSError, AttributeError):
            load1 = load5 = load15 = None

        # --- Memory ---
        vm = psutil.virtual_memory()
        sm = psutil.swap_memory()

        # --- Disk usage + I/O rate ---
        du = psutil.disk_usage("/")
        disk = psutil.disk_io_counters()
        if disk and self._prev_disk:
            read_bps = (disk.read_bytes - self._prev_disk.read_bytes) / dt
            write_bps = (disk.write_bytes - self._prev_disk.write_bytes) / dt
            iops = (
                (disk.read_count - self._prev_disk.read_count)
                + (disk.write_count - self._prev_disk.write_count)
            ) / dt
        else:
            read_bps = write_bps = iops = 0.0
        self._prev_disk = disk

        # --- Network throughput ---
        net = psutil.net_io_counters()
        if net and self._prev_net:
            rx_bps = (net.bytes_recv - self._prev_net.bytes_recv) / dt
            tx_bps = (net.bytes_sent - self._prev_net.bytes_sent) / dt
            rx_pps = (net.packets_recv - self._prev_net.packets_recv) / dt
            tx_pps = (net.packets_sent - self._prev_net.packets_sent) / dt
        else:
            rx_bps = tx_bps = rx_pps = tx_pps = 0.0
        self._prev_net = net

        # --- Real power via Intel RAPL (measured watts) ---
        power_w = None
        if self._rapl_path:
            cur = _read_rapl_uj(self._rapl_path)
            if cur is not None and self._prev_rapl is not None and cur >= self._prev_rapl:
                # energy delta (µJ) -> J -> W. Guard the wraparound case (cur<prev).
                power_w = round((cur - self._prev_rapl) / 1e6 / dt, 1)
            if cur is not None:
                self._prev_rapl = cur

        self._prev_t = now

        # --- Battery / power ---
        try:
            bat = psutil.sensors_battery()
        except (AttributeError, OSError):
            bat = None
        battery = None
        if bat is not None:
            secs = bat.secsleft
            battery = {
                "percent": round(bat.percent, 1),
                "plugged": bool(bat.power_plugged),
                "secsLeft": None
                if secs in (psutil.POWER_TIME_UNLIMITED, psutil.POWER_TIME_UNKNOWN)
                else int(secs),
            }

        # --- Top processes by CPU ---
        procs: list[dict[str, Any]] = []
        for p in psutil.process_iter(["pid", "name", "cpu_percent", "memory_percent"]):
            info = p.info
            procs.append(
                {
                    "pid": info["pid"],
                    "name": (info["name"] or "?")[:24],
                    "cpu": round(info["cpu_percent"] or 0.0, 1),
                    "mem": round(info["memory_percent"] or 0.0, 1),
                }
            )
        top_cpu = sorted(procs, key=lambda x: x["cpu"], reverse=True)[:5]

        return {
            "ts": time.time(),
            "host": os.uname().nodename if hasattr(os, "uname") else "localhost",
            "uptime": _fmt_uptime(time.time() - psutil.boot_time()),
            "cpu": {
                "pct": round(cpu_pct, 1),
                "perCore": [round(c, 1) for c in per_core],
                "cores": psutil.cpu_count(logical=True),
                "freqMhz": round(freq.current) if freq else None,
                "freqMaxMhz": round(freq.max) if freq and freq.max else None,
                "load": None if load1 is None else [round(load1, 2), round(load5, 2), round(load15, 2)],
                "tempC": _cpu_temp(),
            },
            "mem": {
                "pct": round(vm.percent, 1),
                "usedGb": round(vm.used / 1e9, 2),
                "totalGb": round(vm.total / 1e9, 2),
                "swapPct": round(sm.percent, 1),
            },
            "disk": {
                "pct": round(du.percent, 1),
                "usedGb": round(du.used / 1e9, 1),
                "totalGb": round(du.total / 1e9, 1),
                "readMbps": round(read_bps / 1e6, 2),
                "writeMbps": round(write_bps / 1e6, 2),
                "iops": round(iops, 1),
            },
            "net": {
                "rxMbps": round(rx_bps * 8 / 1e6, 2),  # bytes/s -> megabits/s
                "txMbps": round(tx_bps * 8 / 1e6, 2),
                "rxPps": round(rx_pps),
                "txPps": round(tx_pps),
            },
            "fanRpm": _fan_rpm(),
            "battery": battery,
            "gpu": read_intel_gpu(),
            # Real measured system power (watts) from Intel RAPL, or None if the
            # counter isn't readable (frontend then falls back to its estimate).
            "powerW": power_w,
            "topCpu": top_cpu,
        }


# Module-level singleton: rates need continuity across requests.
_sampler = _Sampler()


def snapshot(with_components: bool = False) -> dict[str, Any]:
    """
    One live reading of the host machine. Safe to call repeatedly.

    When ``with_components`` is set, the full per-device component payload
    (`components`: fans/disks/NICs/power/status) is attached. The SSE stream uses
    this so it is the single source of truth: the detail panels' per-device lists
    and the aggregate scalar cards come from the SAME frame, so paired values
    (e.g. FAN SPEED vs the FAN-1 list entry) can never disagree due to separate
    refresh cadences. Callers that only need scalars (e.g. rack telemetry) omit
    it to avoid the extra per-device sensor work.
    """
    snap = _sampler.sample()
    if with_components:
        snap["components"] = host_components()
    return snap
