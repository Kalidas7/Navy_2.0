"""
HTTP handlers — deliberately thin.

Each view: call the service layer, 404 if the rack is unknown, serialize, return.
No business logic and no data access live here (that's services.py / data.py).

The System* views are the exception to "thin": they expose *real* host metrics
(sysmetrics.py) rather than the simulated fleet, including an SSE stream.
"""
import json
import time

from django.http import JsonResponse, StreamingHttpResponse
from django.views import View
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services, sysmetrics
from .serializers import (
    CompDataSerializer,
    LogEntrySerializer,
    ServerSerializer,
    TelemetrySerializer,
)


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
        try:
            interval = float(request.GET.get("interval", "1.0"))
        except ValueError:
            interval = 1.0
        interval = min(max(interval, 0.5), 10.0)

        def event_stream():
            # Advise the client how soon to retry if the connection drops.
            yield "retry: 3000\n\n"
            while True:
                # with_components: each frame carries the full per-device payload
                # so the panels' lists and the scalar cards share one source.
                snap = sysmetrics.snapshot(with_components=True)
                yield f"data: {json.dumps(snap)}\n\n"
                time.sleep(interval)

        resp = StreamingHttpResponse(
            event_stream(), content_type="text/event-stream"
        )
        resp["Cache-Control"] = "no-cache"
        resp["X-Accel-Buffering"] = "no"  # disable proxy buffering (nginx)
        return resp
