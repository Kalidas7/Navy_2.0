# Working Preferences

## Writing Convention for CLAUDE.md Files

-   Always use "Kalidas" (or "the human") and "Claude" instead of
    pronouns
-   Never use "I", "you", "me", "my", or "your" in CLAUDE.md files
-   This avoids ambiguity about who "I" or "you" refers to
-   Example: "Kalidas writes, Claude edits" (not "I write, you edit")

## Planning Protocol

**Always plan before implementation**

-   Discuss overall strategy before writing code or making changes
-   Ask clarifying questions one at a time so Kalidas can give complete
    answers
-   Get approval on the approach before implementation
-   Focus on understanding requirements and flow first

### Multi-level planning

-   Plan at the high level (overall project goals and flow)
-   Then plan at the task level (specific file or feature details)
-   Implement the plan only after both levels are planned and approved

### Check understanding

-   After completing each task, ask if Kalidas has questions about what
    was just done
-   Important that Kalidas understands all the changes made together

## Feedback Style

-   Give clear, direct feedback and critiques --- no hedging or gentle
    suggestions
-   Use specific examples rather than vague advice
-   Use bullet points for feedback and summaries

## MD File Update Rule

-   Claude must ALWAYS ask Kalidas before editing any `.md` file
-   Say exactly: "I'd like to update [filename] with [what]. Should
    I proceed?"
-   Wait for explicit "yes" before making any changes
-   Never change existing content in `.md` files without Kalidas's
    verification
-   Verify with Kalidas before adding, removing, or updating any `.md`
    file
-   This rule applies every time --- no exceptions, even for small edits

# Current State of the Program

## What the app is

-   Naval Server Console ("NDS-CMS") --- a fleet dashboard with a 3D rack
    view. React + Vite frontend, Django REST backend.
-   The fleet lists one REAL rack (`localhost`, "This Machine") plus 12
    empty "INS" vessel shells. Only the localhost rack has live data;
    every other rack renders "---".

## How to run

-   Both at once: `./run-local.sh` from the project root.
-   Backend: `cd backend && .venv/bin/python manage.py runserver 127.0.0.1:8000`
    --- do NOT pass `--noreload` (it stops code edits from hot-reloading
    and causes stale-code bugs).
-   Frontend: `cd frontend && npm run dev` --- serves http://localhost:5173,
    proxies `/api` to Django on :8000.

## Architecture

-   Backend `fleet/sysmetrics.py` reads REAL host metrics via `psutil`
    (CPU, memory, temp, disks, NICs, battery, fans, top processes) plus
    Intel RAPL for measured power and `journalctl` for real logs.
-   `fleet/data.py` holds the fleet identity rows (no fabricated
    telemetry); `fleet/services.py` is the only layer that reads it.
-   Live data reaches the frontend over ONE Server-Sent Events stream
    (`GET /api/system/stream`, one frame/second). Each SSE frame carries
    both the scalar readings AND the full per-device component payload,
    so the panels and the summary cards share a single source and never
    disagree. There is no polling.
-   Frontend: `SystemMetricsContext` opens the single SSE subscription;
    `useSystemMetricsSource` derives a `GraphValues` object the panels
    bind to. `AppContext` mirrors each frame's components into state.

## Data-honesty rule

-   No fake, simulated, or random data anywhere. The client-side
    simulator was removed.
-   When a sensor is missing, the UI shows "---" --- it must NEVER
    substitute a derived/guessed value mislabeled as a real reading.
-   Fan RPM convention: real RPM when spinning, "IDLE" when the fan is
    present but stopped (0), "---" when there is no fan sensor at all.
-   Power shows measured watts ("POWER") when Intel RAPL is readable,
    else a clearly-labeled estimate ("EST. POWER ~").
