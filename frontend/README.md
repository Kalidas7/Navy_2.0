# Naval Server Console — Frontend

A dark, naval combat-management-system-themed console for monitoring a fleet of
shipboard server racks. Built with **React + Vite + TypeScript** and **three.js**.

Recreated from the design handoff (`design_handoff_naval_server_console`) as
idiomatic React components + a design-token system — **not** a copy of the
prototype's HTML/inline styles. The one part lifted closely (as the handoff
advised) is the three.js scene setup.

## Features

- **Fleet view** — searchable, filterable list of every rack (grid or roster
  layout) with live status, CPU/MEM/TEMP readouts and sparklines, sorted by
  severity (crit → warn → online → standby).
- **3D Detail view** — interactive WebGL model of a single rack with clickable
  hotspots that open a docked telemetry "rail" for each subsystem (display,
  status array, drive bays, network ports, cooling fans, power unit).
- **Live simulation** — all telemetry is simulated client-side on an 800ms tick
  (ring-buffer time series) with a 1s clock. There is no real backend yet.

## Stack

- React 18 + Vite 5 + TypeScript (strict)
- three.js r0.160 (`GLTFLoader`, `OrbitControls`, `RoomEnvironment`)
- Google Fonts: Saira, Saira Condensed, JetBrains Mono (loaded in `index.html`)

## Getting started

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
```

Build / preview / typecheck:

```bash
npm run build
npm run preview
npm run typecheck
```

## Project structure

```
frontend/src/
├── app/                 # App shell, context/store, reducer, selectors
│   ├── App.tsx          # mounts persistent canvas + routes home/detail
│   ├── AppContext.tsx   # provider: reducer + simulation + tick/clock timers
│   ├── store.ts         # state shape, reducer, action creators
│   └── selectors.ts     # pure view-model derivations (filter/sort/counts)
├── components/
│   ├── common/          # Sparkline, StatusPill, StatCard, ToggleChip, ProgressBar
│   └── layout/          # SceneCanvas (persistent 3D layer)
├── config/              # tokens, theme, component defs, scene/glb constants
├── data/                # fleet generator + telemetry simulation engine
├── screens/             # top-level screens, each a folder with index.tsx + styles.module.css
│   ├── home/            # Home screen (header, status strip, toolbar, grid/roster)
│   └── server-details/  # 3D server-details screen: chrome + rail + 6 subsystem panels
├── hooks/               # useGraphValues (per-tick sim snapshot)
├── lib/                 # random, sparkline, clock helpers
├── three/               # SceneController (framework-agnostic) + useScene bridge
├── styles/              # global.css (reset, fonts, keyframes, hover affordances)
└── types/               # domain types
```

## Design tokens

The single source of truth for colours, fonts, status meta, and toggle styling
is [`src/config/tokens.ts`](src/config/tokens.ts). The hard-edged aesthetic
(square corners everywhere except dots / the radar scope / port squares) is
intentional and enforced in `global.css`.

Tweakable theme config (accent, navy tint, hotspot labels, default auto-rotate)
lives in [`src/config/theme.ts`](src/config/theme.ts) and is passed to
`<AppProvider theme={...}>`.

## The 3D scene

`src/three/SceneController.ts` is the framework-agnostic three.js setup lifted
from the handoff: renderer/tone-mapping, camera framing, OrbitControls, lights,
grid, GLB loading, the explode animation, and per-frame hotspot projection. The
React side (`useScene`) only mounts it, syncs `autoRotate`/`exploded`, and
renders the projected HTML markers. Scene/camera/light numbers are in
`src/three/sceneConstants.ts`.

The model is served from `public/assets/models/server-rack.glb`.

## Notes

- Vessel names are Indian Navy ships, carried over from the prototype — confirm
  the intended fleet/naming with the product owner before shipping.
- `RACK DRAW` (dock) and the Display-Panel POWER tab's `DRAW` surface the same
  simulated value in two places (a known prototype quirk).
