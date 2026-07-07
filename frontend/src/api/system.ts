/**
 * Real host-machine metrics feed.
 *
 * The backend exposes this PC's live psutil readings at:
 *   - GET /api/system          → one snapshot (used as a fallback poll)
 *   - GET /api/system/stream   → Server-Sent Events, one frame/second
 *
 * `subscribeSystem` prefers the SSE stream (the strict primary transport) and
 * transparently falls back to interval polling only if EventSource errors for
 * more than a grace window (e.g. a proxy that buffers SSE, a backend restart).
 * The fallback is TEMPORARY: while polling it keeps re-probing the stream, and
 * the moment a real SSE frame arrives again it stops polling and returns to
 * live streaming — so a transient blip self-heals without a page reload.
 * Shapes mirror `backend/fleet/sysmetrics.py` field-for-field.
 */
import type { CompData } from '@/types';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');

export interface SystemMetrics {
  ts: number;
  host: string;
  uptime: string;
  cpu: {
    pct: number;
    perCore: number[];
    cores: number;
    freqMhz: number | null;
    freqMaxMhz: number | null;
    load: [number, number, number] | null;
    tempC: number | null;
  };
  mem: { pct: number; usedGb: number; totalGb: number; swapPct: number };
  disk: {
    pct: number;
    usedGb: number;
    totalGb: number;
    readMbps: number;
    writeMbps: number;
    iops: number;
  };
  net: { rxMbps: number; txMbps: number; rxPps: number; txPps: number };
  fanRpm: number | null;
  battery: { percent: number; plugged: boolean; secsLeft: number | null } | null;
  gpu: { busyPct: number | null; powerW: number | null } | null;
  /** Real measured system power (watts) from Intel RAPL, or null if unreadable. */
  powerW: number | null;
  topCpu: { pid: number; name: string; cpu: number; mem: number }[];
  /**
   * Full per-device component payload (fans/disks/NICs/power/status), present on
   * the SSE stream + /api/system so the detail panels read the SAME frame the
   * scalar cards do. Absent on lean snapshots (telemetry endpoint) → optional.
   */
  components?: CompData;
}

export type SystemStatus = 'connecting' | 'live' | 'polling' | 'error';

interface SubscribeHandlers {
  onData: (m: SystemMetrics) => void;
  onStatus?: (s: SystemStatus) => void;
}

/**
 * Subscribe to live host metrics. Returns an unsubscribe function that tears
 * down whichever transport is active. Call it from a React effect's cleanup.
 */
export function subscribeSystem({ onData, onStatus }: SubscribeHandlers): () => void {
  let closed = false;
  let es: EventSource | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let sseGrace: ReturnType<typeof setTimeout> | null = null;
  // While polling, we periodically re-attempt the SSE stream. When one of those
  // probes opens AND delivers a real frame, we hand control back to SSE and stop
  // polling — so a transient blip (backend restart, dev hot-reload) self-heals
  // instead of stranding the client on polling forever.
  let sseRetry: ReturnType<typeof setInterval> | null = null;

  // How long to grant the browser's native EventSource auto-reconnect before we
  // demote to polling. Generous enough that an ordinary dev hot-reload (~1s drop)
  // never trips the fallback at all.
  const SSE_GRACE_MS = 8000;
  // How often to probe the SSE stream while polling, hoping it has recovered.
  const SSE_RETRY_MS = 10000;

  const status = (s: SystemStatus) => {
    if (!closed) onStatus?.(s);
  };

  const clearGrace = () => {
    if (sseGrace) {
      clearTimeout(sseGrace);
      sseGrace = null;
    }
  };

  const stopPolling = () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    if (sseRetry) {
      clearInterval(sseRetry);
      sseRetry = null;
    }
  };

  const startPolling = () => {
    if (closed || pollTimer) return;
    status('polling');
    const tick = async () => {
      try {
        const res = await fetch(`${BASE_URL}/system`, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as SystemMetrics;
        if (!closed) {
          onData(data);
          // Recovered: polling is delivering data again after a backend blip.
          status('polling');
        }
      } catch {
        // Backend unreachable — keep the interval running so we auto-recover
        // the moment it comes back (e.g. after a restart). Just flag the state.
        status('error');
      }
    };
    void tick();
    pollTimer = setInterval(tick, 1000);
    // Keep trying to climb back to SSE (the strict primary transport).
    if (!sseRetry) {
      sseRetry = setInterval(() => {
        if (!closed && !es) connectSSE();
      }, SSE_RETRY_MS);
    }
  };

  // Demote to polling: close the current stream and start the poll fallback,
  // which in turn keeps probing for SSE to come back.
  const toPolling = () => {
    if (closed || pollTimer) return;
    if (es) {
      es.close();
      es = null;
    }
    startPolling();
  };

  // Open (or re-open) the SSE stream. On the first real frame after a recovery
  // it tears the polling fallback down and returns the UI to live streaming.
  const connectSSE = () => {
    if (closed || es) return;
    try {
      if (!pollTimer) status('connecting');
      const src = new EventSource(`${BASE_URL}/system/stream`);
      es = src;
      src.onopen = () => {
        clearGrace();
        // Don't declare 'live' until an actual frame lands (below) — an open
        // socket that never flushes (buffering proxy) shouldn't stop polling.
        if (!pollTimer) status('live');
      };
      src.onmessage = (ev) => {
        if (closed) return;
        try {
          const data = JSON.parse(ev.data) as SystemMetrics;
          // A real frame arrived over SSE — the stream is genuinely healthy.
          // If we were polling, this is the recovery signal: stop polling.
          if (pollTimer) stopPolling();
          status('live');
          onData(data);
        } catch {
          /* ignore malformed frame */
        }
      };
      src.onerror = () => {
        if (closed) return;
        // A probe that fails while polling: drop it and let the retry timer try
        // again later. Never stop the poll fallback here.
        if (pollTimer) {
          src.close();
          if (es === src) es = null;
          return;
        }
        status('error');
        // Cleanly closed → fall back immediately. Otherwise EventSource is
        // auto-retrying; give it a grace window to recover before we demote.
        if (src.readyState === EventSource.CLOSED) {
          toPolling();
        } else if (!sseGrace) {
          sseGrace = setTimeout(toPolling, SSE_GRACE_MS);
        }
      };
    } catch {
      es = null;
      startPolling();
    }
  };

  connectSSE();

  return () => {
    closed = true;
    clearGrace();
    stopPolling();
    es?.close();
    es = null;
  };
}
