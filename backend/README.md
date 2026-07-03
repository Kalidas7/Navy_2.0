# Naval Server Console — Backend (Django + DRF)

A read-only JSON API that serves the fleet + per-rack telemetry the frontend
consumes. Built with **Django 5 + Django REST Framework**.

> **Data source:** there is intentionally **no real database yet**. The fleet is
> hardcoded in [`fleet/data.py`](fleet/data.py), which stands in for the DB. It's
> a faithful port of the frontend's old client-side generators, so the API
> returns exactly the shapes the UI expects. Swapping in a real datastore later
> means changing only `fleet/data.py` + `fleet/services.py` — nothing above that
> layer (views/serializers/urls) or in the frontend changes. That's the seam.

## Layout (industry standard)

```
backend/
├── manage.py              # Django CLI
├── requirements.txt       # pinned deps
├── config/                # the project (settings/urls/wsgi/asgi)
│   ├── settings.py        # env-driven config (SECRET_KEY, DEBUG, CORS from os.environ)
│   ├── urls.py            # root routes → /api/ + health check
│   └── wsgi.py / asgi.py
└── fleet/                 # the app (our domain)
    ├── data.py            # the hardcoded "database" (fleet rows + derivation rules)
    ├── services.py        # business logic — the ONLY module that touches data.py
    ├── serializers.py     # typed JSON contract (mirrors frontend/src/types)
    ├── views.py           # thin HTTP handlers (call service → serialize → respond)
    └── urls.py            # /api/... route table
```

**Request flow:** `urls → views → services → data`. Each layer has one job, so a
change (new field, real DB, auth) lands in exactly one place.

## Endpoints

| Method | Path                              | Returns                                    |
|--------|-----------------------------------|--------------------------------------------|
| GET    | `/`                               | health check `{service, status}`           |
| GET    | `/api/fleet`                      | `Server[]` — every rack                    |
| GET    | `/api/racks/<id>/telemetry`       | current cpu/ram/temp + subsystem health    |
| GET    | `/api/racks/<id>/components`      | drive bays, fans, ports, PSU, sonar, …     |
| GET    | `/api/racks/<id>/logs`            | mission/system log backlog                 |

Unknown `<id>` → `404 {"detail": "rack not found"}`.

## Run it

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py runserver 127.0.0.1:8000
```

Then: `curl http://127.0.0.1:8000/api/fleet`

The frontend calls this through the Vite dev proxy (`/api` → `:8000`), so run
both `npm run dev` (frontend) and `runserver` (backend) together.

## Configuration (env vars)

All read in `config/settings.py` with local-friendly defaults:

| Var                            | Default                                  | Purpose                         |
|--------------------------------|------------------------------------------|---------------------------------|
| `DJANGO_SECRET_KEY`            | dev key                                  | signing key (set in prod)       |
| `DJANGO_DEBUG`                 | `true`                                   | debug mode                      |
| `DJANGO_ALLOWED_HOSTS`         | `localhost,127.0.0.1,0.0.0.0`            | allowed hosts (comma-sep)       |
| `DJANGO_CORS_ALLOWED_ORIGINS`  | local Vite ports                         | browser CORS origins (comma-sep)|

## Notes

- The throwaway `sqlite3` DB in settings exists only so management commands have
  a `DATABASES` entry; **nothing reads or writes it**. No migrations are needed.
- Live time-series animation (the moving sparklines) is done on the client; this
  API provides the authoritative starting values + health. A future upgrade path
  is streaming telemetry over WebSockets (ASGI is already wired in `config/asgi.py`).
