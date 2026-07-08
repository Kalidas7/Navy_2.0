"""
Service layer — the only module that talks to the "database" (``data.py``).

Views call these functions; they never touch ``data`` directly. That keeps a
single seam: swap ``data.py`` for a real ORM here and nothing above this layer
changes. Each function returns plain dicts/lists ready for serialization.
"""
from __future__ import annotations

from . import data


def list_fleet() -> list[dict]:
    """Every rack, as the frontend's Server[] shape."""
    return list(data.all_servers())


def get_rack(server_id: str) -> dict | None:
    return data.get_server(server_id)


def rack_components(server_id: str) -> dict | None:
    """
    Per-subsystem component data for one rack, or None if unknown.

    The localhost rack returns REAL per-device data (actual disks, fans,
    battery, NICs — see sysmetrics.host_components). Simulated racks have no
    live hardware, so they return an empty payload (the UI renders "—").
    """
    server = data.get_server(server_id)
    if server is None:
        return None
    if data.is_live_host(server_id):
        from . import sysmetrics

        return sysmetrics.host_components()
    # Non-localhost racks: no real hardware → blank component payload.
    return {
        "driveBays": [],
        "fans": [],
        "netPorts": [],
        "psuMods": [],
        "psuRails": [],
        "statusItems": [],
        "contacts": [],
    }


def rack_logs(server_id: str) -> list[dict] | None:
    """
    Log backlog for one rack.

    localhost returns the machine's REAL recent journal/syslog lines. Simulated
    racks have no live host behind them, so they return an empty list (the UI
    renders "NO LOG SOURCE") rather than a fabricated backlog.
    """
    server = data.get_server(server_id)
    if server is None:
        return None
    if data.is_live_host(server_id):
        from . import sysmetrics

        return sysmetrics.host_logs()
    return []
