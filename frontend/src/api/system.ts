/**
 * Real host-machine metrics feed.
 *
 * The backend exposes this PC's live psutil readings at:
 *   - GET /api/system          → one snapshot (used as a fallback poll)
 *   - GET /api/system/stream   → Server-Sent Events, one frame/second
 *
 * `subscribeSystem` prefers the SSE stream and transparently falls back to
 * interval polling if EventSource errors (e.g. a proxy that buffers SSE).
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

  const status = (s: SystemStatus) => {
    if (!closed) onStatus?.(s);
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
  };

  // Prefer SSE; fall back to polling on error. If SSE errors for more than a
  // short grace period (backend restart, wedged native retry, buffering proxy),
  // switch to polling — which reconnects on its own once the backend returns.
  let sseGrace: ReturnType<typeof setTimeout> | null = null;
  const toPolling = () => {
    if (closed || pollTimer) return;
    if (es) {
      es.close();
      es = null;
    }
    startPolling();
  };

  try {
    status('connecting');
    es = new EventSource(`${BASE_URL}/system/stream`);
    es.onopen = () => {
      if (sseGrace) {
        clearTimeout(sseGrace);
        sseGrace = null;
      }
      status('live');
    };
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as SystemMetrics;
        if (!closed) onData(data);
      } catch {
        /* ignore malformed frame */
      }
    };
    es.onerror = () => {
      if (closed) return;
      status('error');
      // Cleanly closed → fall back immediately. Otherwise EventSource is stuck
      // retrying; give it 3s to recover, then take over with polling so the UI
      // never freezes on a stale frame after a backend restart.
      if (es && es.readyState === EventSource.CLOSED) {
        toPolling();
      } else if (!sseGrace) {
        sseGrace = setTimeout(toPolling, 3000);
      }
    };
  } catch {
    startPolling();
  }

  return () => {
    closed = true;
    if (sseGrace) clearTimeout(sseGrace);
    es?.close();
    if (pollTimer) clearInterval(pollTimer);
  };
}
