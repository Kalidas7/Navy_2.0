"""
Persisted metric history.

The live SSE feed (sysmetrics.py) is ephemeral — the frontend keeps only a
~48-sample in-memory ring buffer, lost on reload. To back the 1D / 7D / 1M /
Custom time-range graphs with REAL data, every streamed frame is written here as
one ``MetricSample`` row. The history endpoint (views.SystemHistoryView) reads
these back, bucketed/averaged down to a renderable number of points.

Honesty note: this stores only what was actually measured. Fields the host can't
read (e.g. no temp sensor) are saved as NULL and surface as gaps, never guesses.

Scope: every subsystem menu's plottable scalars are persisted — CPU/RAM/temp
(Screen), fan RPM + disk I/O (Fan), net rx/tx (Net), power/GPU/battery (Power),
IOPS + disk% (Drives). Each menu's non-Live view graphs only ITS OWN fields.
Menus with no single time-series (Status = per-core snapshot) persist nothing
extra and show no history graph.
"""
from __future__ import annotations

from django.db import models


class MetricSample(models.Model):
    """One host reading at a point in time. Written once per SSE frame (~1/s)."""

    # Wall-clock capture time (server-side). Indexed because every history query
    # filters and orders on it.
    ts = models.DateTimeField(db_index=True)

    # All scalars nullable so a missing sensor is stored as an honest gap rather
    # than a fabricated 0. Each field backs one subsystem menu's history graphs;
    # a menu whose metrics are all-NULL simply shows gaps (never a guess).

    # Screen / System
    cpu = models.FloatField(null=True)       # CPU busy %
    ram = models.FloatField(null=True)       # memory used %
    temp = models.FloatField(null=True)      # CPU package temperature, °C

    # Fan
    fan_rpm = models.FloatField(null=True)   # fan speed, RPM (0 = idle)
    disk_io = models.FloatField(null=True)   # disk read+write throughput, MB/s

    # Net
    net_rx = models.FloatField(null=True)    # ingress, Mbps
    net_tx = models.FloatField(null=True)    # egress, Mbps

    # Power
    power_w = models.FloatField(null=True)   # system draw, W (measured or estimated)
    # True when power_w is a derived ESTIMATE (RAPL unreadable → 8W+CPU model),
    # False when it's a real measured RAPL reading. Lets the graph label it
    # honestly ("EST. POWER" vs "POWER") and never pass an estimate off as real.
    power_est = models.BooleanField(default=False)
    gpu_pct = models.FloatField(null=True)   # GPU busy %
    batt_pct = models.FloatField(null=True)  # battery charge %

    # Drives
    iops = models.FloatField(null=True)      # disk IOPS
    disk_pct = models.FloatField(null=True)  # disk usage %

    class Meta:
        # Newest-first is the common read order; also speeds range slicing.
        ordering = ("-ts",)
        indexes = [models.Index(fields=["ts"])]

    def __str__(self) -> str:  # pragma: no cover - debug aid only
        return f"MetricSample(ts={self.ts.isoformat()}, cpu={self.cpu})"
