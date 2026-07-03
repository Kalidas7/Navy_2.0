"""
The fleet "database".

This module stands in for a real datastore. Instead of querying Postgres, the
service layer reads the module-level ``SERVERS`` list built here at import time
— so from the rest of the app's point of view this file *is* the DB: the single
place that owns the fleet's rows. When a real DB is introduced later, only this
module and the service layer change; views/serializers/urls and the whole
frontend stay put — that's the seam.

The fleet is a SINGLE live rack — ``localhost-2`` — whose scalars come from real
psutil samples (see ``sysmetrics.py``). Its per-device component data and log
lines are served by the service layer from ``sysmetrics``. Adding another card
later is just another row here pointed at a 3D model; the whole app renders it
with the same generalized live behavior.
"""
from __future__ import annotations

from typing import Literal, TypedDict

# ---------------------------------------------------------------------------
# Seed data — the "table contents"
# ---------------------------------------------------------------------------

RackStatus = Literal["online", "warn", "crit", "standby"]


# ---------------------------------------------------------------------------
# Typed row shapes (documentation + editor help; not enforced at runtime)
# ---------------------------------------------------------------------------

class ServerRow(TypedDict):
    id: str
    code: str
    vessel: str
    pennant: str
    role: str
    status: RackStatus
    cpu: int
    ram: int
    temp: int
    uptime: str
    buf: list[float]


# ---------------------------------------------------------------------------
# The single live host rack
# ---------------------------------------------------------------------------
# The one rack in the fleet represents the machine this backend runs on; its
# detail view streams live psutil metrics (see sysmetrics.py + the /api/system
# endpoints). Scalar readings here are cheap placeholders — the real values reach
# the UI through the live SSE stream, which the home card and detail view consume.

LOCAL_HOST_ID = "localhost-2"


def is_live_host(server_id: str) -> bool:
    """Every known rack is a live host now (the fleet is a single live rack)."""
    return server_id == LOCAL_HOST_ID


def _local_host_row() -> ServerRow:
    """
    Build the live-host rack's IDENTITY row (no live telemetry).

    Deliberately cheap: cpu/ram/temp = 0 placeholders. The real values reach the
    UI through the live SSE stream (/api/system), so calling the expensive
    snapshot() here would be redundant work the stream overwrites a second later.
    /api/fleet stays fast and side-effect-free.
    """
    return ServerRow(
        id=LOCAL_HOST_ID,
        code="LOCAL-HOST-02",
        vessel="This Machine",
        pennant="PC",
        role="Live Host Telemetry",
        status="online",
        cpu=0,
        ram=0,
        temp=0,
        uptime="—",
        buf=[],
    )


# The "table": a single live rack, rebuilt on each listing so its scalars stay
# fresh. Built once at import for a stable identity.
SERVERS: list[ServerRow] = [_local_host_row()]
_SERVERS_BY_ID: dict[str, ServerRow] = {s["id"]: s for s in SERVERS}


def all_servers() -> list[ServerRow]:
    # Refresh the host rack's scalars from a live snapshot on each listing.
    SERVERS[0] = _local_host_row()
    _SERVERS_BY_ID[LOCAL_HOST_ID] = SERVERS[0]
    return SERVERS


def get_server(server_id: str) -> ServerRow | None:
    return _SERVERS_BY_ID.get(server_id)


# ---------------------------------------------------------------------------
# Derived per-rack data
# ---------------------------------------------------------------------------

CompState = Literal["ok", "warn", "crit", "standby"]


def states_for(status: RackStatus) -> dict[str, CompState]:
    """Map a rack status to the health of its six subsystems (statesFor)."""
    if status == "crit":
        return {"screen": "ok", "status": "crit", "drives": "warn", "net": "ok", "fan": "crit", "power": "ok"}
    if status == "warn":
        return {"screen": "ok", "status": "warn", "drives": "ok", "net": "ok", "fan": "warn", "power": "ok"}
    if status == "standby":
        return {"screen": "ok", "status": "standby", "drives": "ok", "net": "standby", "fan": "ok", "power": "ok"}
    return {"screen": "ok", "status": "ok", "drives": "ok", "net": "ok", "fan": "ok", "power": "ok"}


# Real per-rack component data comes from the service layer: the live rack from
# sysmetrics.host_components() (actual disks/fans/battery/NICs). There is
# deliberately NO component generator here — nothing fabricates data.
# Real log lines likewise come from sysmetrics.host_logs().
