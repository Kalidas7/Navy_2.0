# How to Run — Live vs Web Demo

This app has **two data modes**, chosen when you start it:

- **Live** (default) — real readings from this machine's backend.
- **Web demo** — fully simulated (fake) data, **no backend needed**.
  This is the mode that gets hosted on Vercel.

---

## Run the WEB DEMO (fake data) locally

```bash
cd frontend
VITE_DATA_MODE=web npm run dev
```

Then open the URL it prints (usually <http://localhost:5173/>).
You'll see a **"DEMO · SIMULATED DATA"** banner and moving fake values.

Stop it with **Ctrl + C**.

---

## Run in LIVE mode (real data)

```bash
cd frontend
npm run dev
```

Stop it with **Ctrl + C**.

---

## The toggle, in one line

The only difference is the `VITE_DATA_MODE=web` prefix:

| Command                          | Mode                  |
| -------------------------------- | --------------------- |
| `VITE_DATA_MODE=web npm run dev` | Fake data (demo)      |
| `npm run dev`                    | Real data (live host) |

---

## Notes

- **Port:** usually `5173`. If it says "in use," it picks `5174` — use
  whatever URL it prints.
- **Must run inside `frontend/`** — the `cd frontend` step is required.
- **Mode is set at start time**, not while running. To switch modes,
  stop the server (Ctrl + C) and start it again with the other command.

---

## Hosting the demo on Vercel

You do **not** edit any files for this. In the Vercel dashboard:

1. **Root Directory** = `frontend`
2. **Environment Variable:** `VITE_DATA_MODE` = `web`
3. Deploy.

Vercel then builds the demo (fake data, no backend). Your laptop stays in
live mode.
