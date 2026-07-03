# Naval Server Console

Interactive 3D fleet monitoring console for shipboard server racks — a dark,
naval combat-management-system-themed UI recreated from the design handoff in
`design_handoff_naval_server_console`.

This is a monorepo-style layout with a separate, organized **frontend** and
**backend**.

```
Navy_3d/
├── frontend/   # React + Vite + TypeScript + three.js   (the UI)
└── backend/    # Django + DRF + psutil                  (real host telemetry)
```

The **localhost rack** ("LOCAL-HOST-01") shows **real, live metrics from the
machine the backend runs on** — CPU, RAM, temperature, fan RPM, disk, network,
battery, and Intel GPU. Every other rack is an empty placeholder that renders
"—" (no live feed). Nothing is simulated anymore.

## Quick start

Two servers must run — the backend (reads the hardware) and the frontend (shows
it). Open two terminals:

```bash
# Terminal 1 — backend (required for any live data)
cd backend
python3 -m venv .venv && source .venv/bin/activate   # first time only
pip install -r requirements.txt                       # first time only
NAVY_ENABLE_GPU=1 python manage.py runserver           # → http://127.0.0.1:8000

# Terminal 2 — frontend
cd frontend
npm install        # first time only
npm run dev        # → http://localhost:5173
```

Then open **http://localhost:5173/server/localhost**.

> **Why both?** The browser sandbox can't read your CPU/fan/temp — only a
> process running *on the machine* can. The backend (Python + psutil) reads the
> hardware; the frontend just displays it. See the architecture below.

To watch the same live data in your terminal (matches the website 1:1):

```bash
cd backend && NAVY_ENABLE_GPU=1 .venv/bin/python live_stats.py
```

## How it works (Architecture)

### The big picture — two servers, two jobs

```
        YOUR LAPTOP
┌──────────────────────────────────────────────────────────────┐
│                                                                │
│   ┌────────────────┐        ┌────────────────┐                │
│   │  BACKEND        │        │  FRONTEND       │                │
│   │  Django :8000   │◀──────▶│  Vite :5173     │                │
│   │                 │  /api  │                 │                │
│   │  reads hardware │        │  serves the app │                │
│   │  via psutil     │        │  + proxies /api │                │
│   └───────┬────────┘        └───────┬────────┘                │
│           │ reads                    │ serves                  │
│           ▼                          ▼                          │
│   /sys, /proc,               ┌──────────────┐                  │
│   psutil, intel_gpu_top      │   BROWSER     │                  │
│   (CPU, fan, temp, …)        │  (React UI)   │                  │
│                              └──────────────┘                  │
└──────────────────────────────────────────────────────────────┘

Backend  = the kitchen (reads real hardware, cooks the data)
Frontend = the dining room (shows the data; also passes /api calls to the kitchen)
```

The frontend's Vite server **proxies** any `/api/...` request to Django on
:8000, so the browser only ever talks to one origin (no CORS headaches).

### Two ways data travels: one-shot calls vs. a live stream

The app uses **two different delivery methods** depending on how often the data
changes:

| Data | Changes | Delivery | Endpoint |
|------|---------|----------|----------|
| CPU, RAM, temp, fan, GPU, net | every second | **SSE stream** (pushed) | `GET /api/system/stream` |
| Fleet list | rarely | one-shot fetch | `GET /api/fleet` |
| Components (disks/fans/PSU) | slowly | fetch + 5 s poll | `GET /api/racks/:id/components` |
| Logs | on open | one-shot fetch | `GET /api/racks/:id/logs` |

### Normal API call vs. SSE — the key difference

A **normal API call** is like ordering pizza by phone: call, get one pizza, hang
up. Want another? Call again. That's **polling** — a new request every second:

```
POLLING  (a new request each second — wasteful)

Browser ──"data?"──▶ Server ──"here"──▶ [close]
Browser ──"data?"──▶ Server ──"here"──▶ [close]      1s later
Browser ──"data?"──▶ Server ──"here"──▶ [close]      1s later
   (new connection + headers every single time)
```

**SSE (Server-Sent Events)** is like keeping one phone line open while pizzas
keep arriving. The browser makes **ONE** request; the server holds it open and
keeps pushing new data down the same line, forever:

```
SSE  (ONE request, server pushes forever — efficient)

Browser ──"open stream"──▶ Server
                             │ (line stays open)
                             ├──▶ data   (1s)
                             ├──▶ data   (2s)
                             ├──▶ data   (3s)
                             └──▶ …never closes
```

**So SSE is NOT an API call per second — it's one API call that never finishes,**
dripping a new frame down the open connection every second.

### The SSE wire format (it's just text)

The server writes plain text lines. Each `data:` line + a blank line = one
message:

```
data: {"cpu":{"pct":12.5},"fanRpm":2700,"gpu":{"busyPct":47}}

data: {"cpu":{"pct":18.1},"fanRpm":2715,"gpu":{"busyPct":51}}

data: {"cpu":{"pct":9.3},"fanRpm":2680,"gpu":{"busyPct":44}}
```

**Backend** ([`fleet/views.py`](backend/fleet/views.py)) — a generator that
never returns:

```python
def event_stream():
    while True:                                  # never ends → connection stays open
        snap = sysmetrics.snapshot()             # read real CPU/fan/GPU/…
        yield f"data: {json.dumps(snap)}\n\n"    # push ONE frame
        time.sleep(1)                            # wait, then loop
```

**Frontend** ([`api/system.ts`](frontend/src/api/system.ts)) — one connection,
auto-fires on each frame, auto-reconnects if dropped:

```javascript
const es = new EventSource('/api/system/stream');   // opens ONE connection
es.onmessage = (event) => {
    const snapshot = JSON.parse(event.data);         // fires every second
    onData(snapshot);                                 // hand it to React
};
```

### One stream, shared by everyone

The SSE connection is opened **exactly once** (in `SystemMetricsContext`) and
its data is shared through React Context. All 7 components that need live data
read the **same** copy — they do NOT each open their own stream:

```
        ┌──────────────────────────────┐
        │  1 SSE stream  /api/system/stream │
        └───────────────┬──────────────┘
                        │ (opened once, in SystemMetricsContext)
                        ▼
        ┌──────────────────────────────┐
        │      React Context            │   ← stores the latest snapshot
        │   useSystemMetrics()          │
        └──┬────┬────┬────┬────┬────┬───┘
           ▼    ▼    ▼    ▼    ▼    ▼
         dock  POWER FAN  DRIVE home  detail   ← all read the SAME data,
              panel panel panel card  view       all update together
```

### Worked example — watching your fan spin up

1. **Hardware:** you open a heavy app → CPU hits 96% → laptop heats up → the
   **fan physically spins up to 3564 RPM**.
2. **Backend:** on its next 1-second tick, `psutil.sensors_fans()` reads
   `3564`; `snapshot()` bundles it into the JSON frame.
3. **Push:** the backend does `yield "data: {…fanRpm:3564…}\n\n"` down the
   already-open SSE line — no new request needed.
4. **Browser:** `EventSource.onmessage` fires with the new frame → React Context
   updates.
5. **Screen:** the dock, the POWER panel, and `live_stats.py` in your terminal
   **all show 3564** at the same time — about 1 second after the fan actually
   sped up. No refresh, no button.

### The full pipeline, top to bottom

```
  YOUR HARDWARE          fan @ 2700 RPM, CPU @ 12%, GPU @ 47%, …
       │                 (Linux exposes these in /sys and /proc)
       ▼
  psutil / intel_gpu_top   backend/fleet/sysmetrics.py reads them
       │                    → snapshot() = one JSON object
       ▼
  Django  /api/system/stream   pushes that JSON every 1s (SSE)
       │
       ▼
  Vite proxy (:5173)       forwards /api → Django (:8000)
       │
       ▼
  EventSource (browser)    onmessage fires each second
       │
       ▼
  React Context            one shared copy of the latest snapshot
       │
       ├────────┬────────┬─────────┐
       ▼        ▼        ▼         ▼
     dock    panels   home card  live_stats.py (terminal)
   "FAN 2700"  (all read the same data, update together)
```

### Enabling real GPU + power (one-time, optional)

Two readings need extra permission (same idea for both):

```bash
# Intel GPU utilisation (intel_gpu_top needs perf-counter access):
sudo apt install intel-gpu-tools
sudo setcap cap_perfmon+ep $(which intel_gpu_top)

# Real measured watts (Intel RAPL energy counter is root-only by default):
sudo chmod -R a+r /sys/class/powercap/intel-rapl:*/energy_uj
```

Then run the backend with `NAVY_ENABLE_GPU=1`. Without these, GPU shows "—" and
power falls back to a labelled estimate — everything else still works.

## Frontend

React + Vite + TypeScript with three.js for the 3D rack view. Organized to
industry standards (feature folders, shared components, a design-token system,
a framework-agnostic three.js controller). See
[`frontend/README.md`](frontend/README.md) for the full structure and details.

## Backend

**Django 5 + Django REST Framework + psutil.** Reads the real host machine and
serves it over `/api` (fleet, live system stream, per-rack components, logs).
The single source of truth for host metrics is
[`backend/fleet/sysmetrics.py`](backend/fleet/sysmetrics.py) — the same
`snapshot()` powers the SSE stream, the components endpoint, and the
`live_stats.py` terminal monitor. See
[`backend/README.md`](backend/README.md) for the full layout and API contract.

## Design fidelity

High-fidelity recreation. Colours, typography, spacing, and interactions follow
the handoff's Design Tokens exactly; the three.js scene (camera, lights, loader,
hotspot projection, explode animation) is lifted closely as advised. The
prototype's proprietary `.dc.html` / `support.js` runtime was **not** adopted —
only the visual result and behaviour were translated into idiomatic React.
