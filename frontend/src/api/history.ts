/**
 * Persisted metric history (CPU / RAM / temp) backing the 1D / 7D / 1M / Custom
 * time-range graphs. The backend stores every streamed frame and returns it here
 * bucket-averaged to a renderable number of points.
 *
 * Endpoint: GET /api/system/history?range=1d|7d|1m|custom[&from=&to=]  (ms epoch)
 * Shape mirrors backend/fleet/history.py::load_series field-for-field.
 *
 * This feeds the LINE GRAPHS only — the live scalar readouts still come from the
 * SSE stream, so a range change redraws the graph and nothing else.
 */
import { IS_WEB_DEMO } from '@/config/dataMode';
import { simHistory } from '@/api/simulator';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');

/** One bucket-averaged point. Any metric with no readings in the bucket is null (a gap). */
export interface HistoryPoint {
  /** bucket-midpoint timestamp, ms epoch */
  t: number;
  // Screen
  cpu: number | null;
  ram: number | null;
  temp: number | null;
  // Fan
  fan_rpm: number | null;
  disk_io: number | null;
  // Net
  net_rx: number | null;
  net_tx: number | null;
  // Power
  power_w: number | null;
  /** True when power_w is an ESTIMATE (RAPL unreadable), not a measured reading. */
  power_est: boolean;
  gpu_pct: number | null;
  batt_pct: number | null;
  // Drives
  iops: number | null;
  disk_pct: number | null;
}

/** Metric field names a HistoryGraph can plot (numeric keys of HistoryPoint). */
export type MetricKey = Exclude<keyof HistoryPoint, 't' | 'power_est'>;

export interface HistorySeries {
  range: string;
  from: string;
  to: string;
  /** Window boundaries as ms-epoch. The graph x-axis spans these, so a small
   *  amount of data occupies only its true slice of a larger window (the graph
   *  "shrinks" as the range grows). */
  fromMs: number;
  toMs: number;
  /** raw rows that fell in the window (before downsampling) */
  count: number;
  points: HistoryPoint[];
}

/** Preset ranges the history endpoint understands (maps 1M → backend "1m"). */
export type HistoryRange = '1d' | '7d' | '1m' | 'custom';

/**
 * Fetch a history series. For `custom`, pass `from`/`to` (ms epoch).
 * Throws on a non-OK response so callers can render an error state.
 */
export async function fetchHistory(
  range: HistoryRange,
  opts?: { from?: number; to?: number; signal?: AbortSignal },
): Promise<HistorySeries> {
  // web-demo mode: synthesize the series client-side, no network.
  if (IS_WEB_DEMO) {
    return simHistory(range, { from: opts?.from, to: opts?.to });
  }
  const qs = new URLSearchParams({ range });
  if (range === 'custom' && opts?.from != null && opts?.to != null) {
    qs.set('from', String(opts.from));
    qs.set('to', String(opts.to));
  }
  const res = await fetch(`${BASE_URL}/system/history?${qs.toString()}`, {
    headers: { Accept: 'application/json' },
    signal: opts?.signal,
  });
  if (!res.ok) throw new Error(`history ${res.status}`);
  return (await res.json()) as HistorySeries;
}
