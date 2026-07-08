/**
 * Data-source mode switch (build-time).
 *
 * The app has two mutually-exclusive data sources, chosen at BUILD time via the
 * `VITE_DATA_MODE` env var so the choice is baked into the bundle:
 *
 *   - 'live' (default) — real host telemetry from the Django backend over SSE.
 *     This is how the app runs on the machine being monitored (Kalidas's laptop).
 *
 *   - 'web' — a FRONTEND-ONLY simulator generates plausible, moving demo data in
 *     the exact same shapes the backend would return. NO `/api` calls are made,
 *     so the build is fully self-contained and can be hosted on a static host
 *     (Vercel) with no backend at all.
 *
 * IMPORTANT (data-honesty rule, see CLAUDE.md): 'web' data is SIMULATED. It must
 * always be presented as a labelled demo (see the DemoBanner) so it is never
 * mistaken for a real reading. 'live' remains the honest, real-sensor path.
 *
 * Set it per environment:
 *   - Laptop / real host:  VITE_DATA_MODE=live   (or leave unset — live is default)
 *   - Vercel static demo:  VITE_DATA_MODE=web
 */
export type DataMode = 'live' | 'web';

/** Resolved once at module load from the build-time env var. Defaults to 'live'. */
export const DATA_MODE: DataMode =
  (import.meta.env.VITE_DATA_MODE ?? 'live') === 'web' ? 'web' : 'live';

/** True when the app is running as the frontend-only simulated web demo. */
export const IS_WEB_DEMO = DATA_MODE === 'web';
