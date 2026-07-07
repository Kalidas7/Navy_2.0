"""
HTTP handlers — deliberately thin.

Each view: call the service layer, 404 if the rack is unknown, serialize, return.
No business logic and no data access live here (that's services.py / data.py).

The System* views are the exception to "thin": they expose *real* host metrics
(sysmetrics.py) rather than the simulated fleet, including an SSE stream.
"""
import json
import threading
import time
from datetime import datetime, timezone

from django.http import JsonResponse, StreamingHttpResponse
from django.views import View
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from . import history, services, sysmetrics
from .serializers import (
    CompDataSerializer,
    LogEntrySerializer,
    ServerSerializer,
    TelemetrySerializer,
)

# --- SSE stream concurrency guard -------------------------------------------
# Each open SSE stream ties up ONE worker thread for the life of the connection
# (true under runserver and any sync/gthread WSGI worker). Without a ceiling a
# handful of tabs — or leaked, never-closed streams — would exhaust every worker
# and the whole API would stop answering. This counter caps how many streams may
# run at once; excess clients get a 503 and their EventSource retries shortly.
_MAX_CONCURRENT_STREAMS = 8
_active_streams = 0
_active_streams_lock = threading.Lock()


def _release_stream_slot() -> None:
    """Give a stream slot back when a stream ends (clamped at 0 defensively)."""
    global _active_streams
    with _active_streams_lock:
        _active_streams = max(0, _active_streams - 1)


class FleetListView(APIView):
    """GET /api/fleet — every rack in the fleet."""

    def get(self, _request):
        data = services.list_fleet()
        return Response(ServerSerializer(data, many=True).data)


class RackTelemetryView(APIView):
    """GET /api/racks/<id>/telemetry — current readouts + subsystem health."""

    def get(self, _request, rack_id: str):
        payload = services.rack_telemetry(rack_id)
        if payload is None:
            return Response({"detail": "rack not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(TelemetrySerializer(payload).data)


class RackComponentsView(APIView):
    """GET /api/racks/<id>/components — drive bays, fans, ports, PSU, sonar, …."""

    def get(self, _request, rack_id: str):
        payload = services.rack_components(rack_id)
        if payload is None:
            return Response({"detail": "rack not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(CompDataSerializer(payload).data)


class RackLogsView(APIView):
    """GET /api/racks/<id>/logs — mission/system log backlog."""

    def get(self, _request, rack_id: str):
        payload = services.rack_logs(rack_id)
        if payload is None:
            return Response({"detail": "rack not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(LogEntrySerializer(payload, many=True).data)


class SystemSnapshotView(View):
    """
    GET /api/system — one live reading of the *host machine* (real psutil data).

    Plain Django View (not DRF) so the payload passes straight through as JSON
    without a serializer; the shape is defined by sysmetrics.snapshot().
    """

    def get(self, _request):
        # Include per-device components so this endpoint mirrors the SSE frame
        # shape (single source of truth for the detail panels).
        return JsonResponse(sysmetrics.snapshot(with_components=True))


class SystemStreamView(View):
    """
    GET /api/system/stream — Server-Sent Events feed of host metrics, one frame
    per second. The browser subscribes with EventSource and gets pushed updates
    over a single long-lived connection.

    Requires a server that can hold the response open. Runs fine under Django's
    dev ``runserver`` (threaded) and any WSGI/ASGI worker that streams.
    """

    def get(self, request):
        # Interval is query-tunable but clamped to keep sampling sane.
        # float() also parses "nan"/"inf", which would slip past the ValueError
        # guard and make time.sleep() raise (nan) or the clamp meaningless — so
        # reject any non-finite value explicitly, then clamp.
        import math

        try:
            interval = float(request.GET.get("interval", "1.0"))
        except (TypeError, ValueError):
            interval = 1.0
        if not math.isfinite(interval):
            interval = 1.0
        interval = min(max(interval, 0.5), 10.0)

        # Refuse to open more than the ceiling of concurrent streams so streams
        # can't starve every worker thread. The client's EventSource will retry
        # (see the retry hint below) and get in once a slot frees up.
        global _active_streams
        with _active_streams_lock:
            if _active_streams >= _MAX_CONCURRENT_STREAMS:
                return JsonResponse(
                    {"detail": "too many concurrent streams; retry shortly"},
                    status=503,
                )
            _active_streams += 1

        def event_stream():
            # Advise the client how soon to retry if the connection drops.
            yield "retry: 3000\n\n"
            try:
                while True:
                    # with_components: each frame carries the full per-device
                    # payload so the panels' lists and the scalar cards share
                    # one source.
                    snap = sysmetrics.snapshot(with_components=True)
                    # Persist this frame so the 1D/7D/1M graphs have REAL
                    # history. Best-effort inside record_sample — never breaks
                    # the stream.
                    history.record_sample(snap)
                    # When the browser closes the EventSource, the WSGI server
                    # tears down this generator: the yield raises GeneratorExit
                    # (or a write to the dead socket raises OSError). Either way
                    # the finally below runs and the loop ends — no zombie thread
                    # left sampling psutil + writing rows forever.
                    yield f"data: {json.dumps(snap)}\n\n"
                    time.sleep(interval)
            except (GeneratorExit, OSError):
                # Client went away — stop cleanly (don't re-raise; let finally run).
                pass
            finally:
                _release_stream_slot()

        resp = StreamingHttpResponse(
            event_stream(), content_type="text/event-stream"
        )
        resp["Cache-Control"] = "no-cache"
        resp["X-Accel-Buffering"] = "no"  # disable proxy buffering (nginx)
        return resp


class SystemHistoryView(View):
    """
    GET /api/system/history — persisted CPU/RAM/temp history for the graphs.

    Query params:
      * ``range`` — one of ``1d`` / ``7d`` / ``1m`` (rolling lookback) or
        ``custom`` (requires ``from`` & ``to``). Defaults to ``1d``.
      * ``from`` / ``to`` — ms-epoch endpoints, only used when range=custom.

    Returns bucket-averaged points (see history.load_series). This backs the
    time-range graphs ONLY; the live scalar readouts still come from the SSE
    stream, so switching ranges changes the line graphs and nothing else.
    """

    def get(self, request):
        range_key = request.GET.get("range", "1d")
        frm = _epoch_ms_param(request, "from")
        to = _epoch_ms_param(request, "to")
        payload = history.load_series(range_key, frm, to)
        return JsonResponse(payload)


def _epoch_ms_param(request, name: str) -> datetime | None:
    """Parse a millisecond-epoch query param into an aware datetime, or None."""
    raw = request.GET.get(name)
    if not raw:
        return None
    try:
        return datetime.fromtimestamp(int(raw) / 1000.0, tz=timezone.utc)
    except (ValueError, OverflowError, OSError):
        return None
