/**
 * Fetch persisted metric history for a time range.
 *
 * Used by the time-range graphs (RailPanel non-Live views, the display-panel
 * temp history graph). It fetches once per range change and, for the rolling
 * presets, refreshes periodically so a long-open panel keeps drifting forward
 * with newly-stored samples. Returns loading/error/empty states so the UI can
 * be honest ("collecting…", "no data yet") instead of faking a line.
 */
import { useEffect, useRef, useState } from 'react';
import { fetchHistory, type HistoryRange, type HistorySeries } from '@/api/history';

export interface HistoryState {
  loading: boolean;
  error: boolean;
  series: HistorySeries | null;
}

/** How often to re-pull a rolling preset while its graph stays open (ms). */
const REFRESH_MS = 30_000;

/**
 * @param range   preset or 'custom'. Pass null to disable fetching (e.g. Live).
 * @param from/to custom endpoints (ms epoch), only read when range==='custom'.
 */
export function useHistory(
  range: HistoryRange | null,
  from?: number,
  to?: number,
): HistoryState {
  const [state, setState] = useState<HistoryState>({ loading: false, error: false, series: null });
  // Keep the last series visible across a refresh so the graph doesn't blank.
  const lastSeries = useRef<HistorySeries | null>(null);

  useEffect(() => {
    if (!range) {
      setState({ loading: false, error: false, series: null });
      lastSeries.current = null;
      return;
    }
    let cancelled = false;
    const ctrl = new AbortController();

    const load = async (firstLoad: boolean) => {
      if (firstLoad) setState({ loading: true, error: false, series: lastSeries.current });
      try {
        const series = await fetchHistory(range, { from, to, signal: ctrl.signal });
        if (cancelled) return;
        lastSeries.current = series;
        setState({ loading: false, error: false, series });
      } catch (e) {
        if (cancelled || (e as Error).name === 'AbortError') return;
        setState({ loading: false, error: true, series: lastSeries.current });
      }
    };

    void load(true);
    // Only rolling presets drift forward; a fixed custom window doesn't change.
    const timer =
      range === 'custom' ? null : setInterval(() => void load(false), REFRESH_MS);

    return () => {
      cancelled = true;
      ctrl.abort();
      if (timer) clearInterval(timer);
    };
  }, [range, from, to]);

  return state;
}
