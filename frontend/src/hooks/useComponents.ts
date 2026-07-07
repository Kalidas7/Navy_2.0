/**
 * Single source for the active rack's per-device component payload
 * (fans/disks/NICs/power/status).
 *
 * For the LIVE host it comes straight off the SSE stream
 * (`useSystemMetrics().components`), so panels update every frame WITHOUT the
 * data ever passing through the shared AppContext — that mirror used to re-render
 * every `useApp()` consumer once a second. For every other (identity-only) rack
 * there is no live feed, so we fall back to `state.comp`, which the one-shot
 * backend overlay on entering the detail view populates (empty for those racks).
 */
import { useApp } from '@/app/AppContext';
import { useSystemMetrics } from '@/app/SystemMetricsContext';
import { isLiveHost } from '@/data/fleet';
import type { CompData } from '@/types';

export function useComponents(): CompData {
  const { state } = useApp();
  const live = useSystemMetrics();
  // Live host: prefer the SSE frame's components (falling back to state.comp
  // before the first frame lands). Other racks: the reducer's overlaid payload.
  if (isLiveHost(state.activeServerId)) {
    return live.components ?? state.comp;
  }
  return state.comp;
}
