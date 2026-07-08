"""
Fleet API routes (mounted under /api/ by config/urls.py).

Endpoints mirror the contract the frontend already implied (see the backend
README): a fleet list plus per-rack telemetry / components / logs.
"""
from django.urls import path

from .views import (
    FleetListView,
    RackComponentsView,
    RackLogsView,
    SystemHistoryView,
    SystemSnapshotView,
    SystemStreamView,
)

urlpatterns = [
    path("fleet", FleetListView.as_view(), name="fleet"),
    path("racks/<str:rack_id>/components", RackComponentsView.as_view(), name="rack-components"),
    path("racks/<str:rack_id>/logs", RackLogsView.as_view(), name="rack-logs"),
    # Real host-machine metrics (this PC), not the simulated fleet.
    path("system", SystemSnapshotView.as_view(), name="system-snapshot"),
    path("system/stream", SystemStreamView.as_view(), name="system-stream"),
    # Persisted CPU/RAM/temp history backing the 1D/7D/1M graphs.
    path("system/history", SystemHistoryView.as_view(), name="system-history"),
]
