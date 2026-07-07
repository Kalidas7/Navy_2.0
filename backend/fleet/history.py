"""
Metric-history persistence + retrieval.

Two responsibilities, kept out of views.py so the SSE handler stays thin:

  * ``record_sample(snap)`` — write one ``MetricSample`` per streamed frame, and
    occasionally prune rows past the retention horizon.
  * ``load_series(range_key, frm, to)`` — read history back for the graphs,
    downsampled (bucket-averaged) to a renderable number of points regardless of
    how many raw rows the range spans.

No fabricated data: a missing sensor is stored/returned as ``None`` (a gap),
never a substituted value.
"""
from __future__ import annotations

import threading
import time
from datetime import datetime, timedelta, timezone
from typing import Any

from django.db.models import Avg, Count, IntegerField, Max
from django.db.models.expressions import RawSQL

from .models import MetricSample


def _bucket_index(window_start_s: float, bucket_s: float, buckets: int) -> RawSQL:
    """
    A DB-side integer bucket index for each row's ``ts``, over a window starting
    at ``window_start_s`` (epoch seconds) with ``bucket_s``-second slices,
    clamped to ``[0, buckets-1]``.

    Computing this in SQL lets the database GROUP BY + AVG per bucket, so the
    query returns ~``buckets`` aggregated rows instead of streaming every raw
    per-second sample into Python — flat query time even at millions of rows.

    SQLite stores ``ts`` as text; ``julianday()`` converts it to a day number,
    and epoch-seconds = (julianday(ts) - 2440587.5) * 86400 (2440587.5 = the
    Julian day of the Unix epoch).
    """
    hi = buckets - 1
    sql = (
        "MIN(%s, MAX(0, CAST("
        "(((julianday(ts) - 2440587.5) * 86400.0) - %s) / %s AS INTEGER)))"
    )
    return RawSQL(sql, (hi, window_start_s, bucket_s), output_field=IntegerField())

# --- write throttle ---------------------------------------------------------
# The SSE stream is 1 frame/sec and the LIVE readouts/sparklines use every one
# of those frames (in-memory, real-time — never touched by this module). But we
# only PERSIST one row every ~10s: the history graphs bucket into ~400 points,
# so a 1D bucket is already ~3.6 min wide (still ~21 stored samples per bucket at
# 10s) — no visible detail loss — while the table grows 10× slower, keeping every
# history query fast even at full 35-day retention. Live stays per-second; only
# the stored trend is coarser.
_WRITE_INTERVAL_S = 10.0
_last_write = 0.0
# The stored history is ONE shared timeline, but several SSE streams (multiple
# tabs, a reconnect overlapping the old stream — up to _MAX_CONCURRENT_STREAMS)
# may call record_sample concurrently from different worker threads. Guard the
# check-and-set so exactly ONE write happens per interval globally, not one per
# stream (an unlocked check-then-set races and lets 2+ streams write per cycle).
_write_lock = threading.Lock()

# --- retention --------------------------------------------------------------
# Keep 35 days: enough for the 1-month view plus margin. Older rows are pruned.
RETENTION_DAYS = 35
# Pruning scans/deletes, so don't do it every frame. Run at most once/hour.
_PRUNE_INTERVAL_S = 3600.0
_last_prune = 0.0

# --- downsampling -----------------------------------------------------------
# Target points per history response. A month at 1 sample/sec is ~3M rows; no
# chart renders that, so bucket the range into ~this many averaged points. The
# sparkline() geometry is only 100px wide, so a few hundred points is plenty.
_TARGET_POINTS = 400

# Preset range → lookback window.
_RANGE_WINDOWS = {
    "1d": timedelta(days=1),
    "7d": timedelta(days=7),
    "1m": timedelta(days=30),
}

# Every persisted NUMERIC field that gets bucket-averaged, in per-point order.
# Each history response carries all of them; the frontend picks its menu's subset.
# NB: power_est is a boolean flag, handled separately (not averaged) — see below.
_FIELDS = (
    "cpu", "ram", "temp",          # Screen
    "fan_rpm", "disk_io",          # Fan
    "net_rx", "net_tx",            # Net
    "power_w", "gpu_pct", "batt_pct",  # Power
    "iops", "disk_pct",            # Drives
)


def _estimate_power(snap: dict[str, Any]) -> float | None:
    """
    Rough system-draw estimate for when RAPL is unreadable, mirroring the live
    'EST. POWER ~' card's formula (useSystemMetricsSource.ts): 8W idle baseline +
    CPU-scaled + any GPU watts. Returns None only if CPU% itself is missing (no
    basis at all). Stored WITH power_est=True so it's never shown as measured.
    """
    cpu = _dig(snap, "cpu", "pct")
    if cpu is None:
        return None
    gpu_w = _dig(snap, "gpu", "powerW") or 0.0
    return round(8 + (cpu / 100.0) * 32 + gpu_w, 2)


def record_sample(snap: dict[str, Any]) -> None:
    """
    Persist one streamed frame as a MetricSample — THROTTLED to one row per
    ``_WRITE_INTERVAL_S`` (~10s). Called every second by the SSE loop, but most
    calls return early: the live feed (per-second) is separate and untouched;
    this only governs the stored history behind the time-range graphs.

    Best-effort: a DB hiccup must never break the live stream, so all errors are
    swallowed (the live feed is the source of truth; history is a bonus).
    """
    global _last_write
    # Atomic check-and-claim: only the thread that advances _last_write proceeds
    # to write; any other concurrent stream sees the fresh timestamp and returns.
    with _write_lock:
        now = time.monotonic()
        # Skip until the interval has elapsed since the last stored row.
        # (`_last_write == 0` on startup → the first frame always persists.)
        if _last_write and now - _last_write < _WRITE_INTERVAL_S:
            return
        _last_write = now

    try:
        # Disk I/O throughput = read + write (both MB/s); either missing → skip.
        read = _dig(snap, "disk", "readMbps")
        write = _dig(snap, "disk", "writeMbps")
        disk_io = (read + write) if (read is not None and write is not None) else None
        # Power: prefer the REAL measured RAPL watts; if unreadable, fall back to
        # the estimate and flag it so the graph labels it "EST." not measured.
        measured = _top(snap, "powerW")
        if measured is not None:
            power_w, power_est = measured, False
        else:
            power_w, power_est = _estimate_power(snap), True
        MetricSample.objects.create(
            ts=datetime.now(timezone.utc),
            # Screen
            cpu=_dig(snap, "cpu", "pct"),
            ram=_dig(snap, "mem", "pct"),
            temp=_dig(snap, "cpu", "tempC"),
            # Fan
            fan_rpm=_top(snap, "fanRpm"),
            disk_io=disk_io,
            # Net
            net_rx=_dig(snap, "net", "rxMbps"),
            net_tx=_dig(snap, "net", "txMbps"),
            # Power
            power_w=power_w,
            power_est=power_est,
            gpu_pct=_dig(snap, "gpu", "busyPct"),
            batt_pct=_dig(snap, "battery", "percent"),
            # Drives
            iops=_dig(snap, "disk", "iops"),
            disk_pct=_dig(snap, "disk", "pct"),
        )
        _maybe_prune()
    except Exception:  # noqa: BLE001 - never let persistence break the stream
        pass


def _dig(d: dict[str, Any], *path: str) -> float | None:
    """Safely walk nested snapshot keys; return None (a gap) if any is missing."""
    cur: Any = d
    for key in path:
        if not isinstance(cur, dict) or cur.get(key) is None:
            return None
        cur = cur[key]
    return cur if isinstance(cur, (int, float)) else None


def _top(d: dict[str, Any], key: str) -> float | None:
    """Read a top-level scalar snapshot key (e.g. fanRpm, powerW); None if absent.

    fanRpm uses -1 as its "no fan sensor" sentinel in the live feed; store that as
    None (a real gap) so the graph never plots a fabricated -1 RPM.
    """
    v = d.get(key)
    if not isinstance(v, (int, float)):
        return None
    if key == "fanRpm" and v < 0:
        return None
    return v


def _maybe_prune() -> None:
    """Delete rows older than the retention horizon, at most once per interval."""
    global _last_prune
    now = time.monotonic()
    if now - _last_prune < _PRUNE_INTERVAL_S:
        return
    _last_prune = now
    cutoff = datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)
    MetricSample.objects.filter(ts__lt=cutoff).delete()


def load_series(
    range_key: str,
    frm: datetime | None = None,
    to: datetime | None = None,
) -> dict[str, Any]:
    """
    Load a downsampled history series for a range.

    ``range_key`` is one of "1d"/"7d"/"1m" (a rolling lookback) or "custom"
    (uses ``frm``/``to``). Returns a dict with parallel arrays:

        {
          "range": "7d",
          "from": <iso>, "to": <iso>,
          "count": <raw rows in window>,
          "points": [
            {"t": <ms epoch>, "cpu": <avg|None>, "ram": ..., "temp": ...,
             "fan_rpm": ..., "disk_io": ..., "net_rx": ..., "net_tx": ...,
             "power_w": ..., "gpu_pct": ..., "batt_pct": ..., "iops": ...,
             "disk_pct": ...},
            ...
          ],
        }

    Every point carries all persisted fields; each frontend menu reads only the
    subset it graphs. A field null in a bucket = no reading there (a real gap).

    Each point is the bucket-average over an equal time slice, so gaps (buckets
    with no rows) are simply absent — the graph shows real coverage only.
    """
    now = datetime.now(timezone.utc)
    if range_key == "custom" and frm and to:
        start, end = frm, to
    else:
        window = _RANGE_WINDOWS.get(range_key, _RANGE_WINDOWS["1d"])
        start, end = now - window, now

    if end <= start:
        return {"range": range_key, "from": start.isoformat(), "to": end.isoformat(),
                "fromMs": round(start.timestamp() * 1000),
                "toMs": round(end.timestamp() * 1000),
                "count": 0, "points": []}

    # Bucket across the FULL WINDOW (start → end), not just the span of collected
    # data. This is what makes the graph "shrink" correctly with the time frame:
    # each bucket sits at its true position in the window, so a small amount of
    # recent data occupies only the right-hand sliver of a 7D/1M view while the
    # empty past is genuinely empty (no line). The window boundaries are returned
    # (fromMs/toMs) so the frontend maps its x-axis to the window, not the data.
    window_start_s = start.timestamp()
    window_end_s = end.timestamp()
    window_span_s = window_end_s - window_start_s  # > 0, guaranteed by end>start
    # One bucket per slice, capped at the target. With sparse data most buckets
    # stay empty (→ no point emitted), which is exactly the desired blank axis.
    buckets = max(1, _TARGET_POINTS)
    bucket_s = window_span_s / buckets

    # Bucket + average IN SQL so the DB returns ~`buckets` aggregated rows instead
    # of streaming every raw row into Python. This keeps the query flat (tens of
    # ms) even at millions of rows — pulling a full month of 1-second samples into
    # Python would otherwise take seconds. The bucket index is computed from the
    # row's epoch offset into the window; SQLite's julianday() gives us the ts as
    # a number. We clamp to [0, buckets-1] so exact-edge samples land in-range.
    bucket_expr = _bucket_index(window_start_s, bucket_s, buckets)
    aggregates: dict[str, Any] = {"n": Count("id"), "est": Max("power_est")}
    for f in _FIELDS:
        aggregates[f] = Avg(f)  # SQLite AVG ignores NULLs → gap stays a gap

    grouped = (
        MetricSample.objects.filter(ts__gte=start, ts__lte=end)
        .annotate(bucket=bucket_expr)
        .values("bucket")
        .annotate(**aggregates)
        .order_by("bucket")
    )

    points = []
    total = 0
    for g in grouped:
        idx = g["bucket"]
        total += g["n"]
        pt: dict[str, Any] = {
            # Bucket timestamp = its slice midpoint within the window (stable).
            "t": round((window_start_s + (idx + 0.5) * bucket_s) * 1000),
        }
        for f in _FIELDS:
            v = g[f]
            pt[f] = round(v, 2) if v is not None else None
        # power_est: MAX over the bucket (any estimated row → the bucket is est.).
        pt["power_est"] = bool(g["est"])
        points.append(pt)

    if total == 0:
        return {"range": range_key, "from": start.isoformat(), "to": end.isoformat(),
                "fromMs": round(window_start_s * 1000),
                "toMs": round(window_end_s * 1000),
                "count": 0, "points": []}

    return {
        "range": range_key,
        "from": start.isoformat(),
        "to": end.isoformat(),
        # Window boundaries as ms-epoch — the frontend maps the x-axis to THESE,
        # so the data shrinks into its true slice of the window.
        "fromMs": round(window_start_s * 1000),
        "toMs": round(window_end_s * 1000),
        "count": total,
        "points": points,
    }
