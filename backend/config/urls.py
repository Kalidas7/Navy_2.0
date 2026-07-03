"""
Root URL configuration.

Everything the frontend needs lives under /api/, delegated to the fleet app so
routes stay colocated with the code that serves them.
"""
from django.http import JsonResponse
from django.urls import include, path


def health(_request):
    """Tiny liveness probe so `curl /` confirms the server is up."""
    return JsonResponse({"service": "naval-server-console-backend", "status": "ok"})


urlpatterns = [
    path("", health),
    path("api/", include("fleet.urls")),
]
