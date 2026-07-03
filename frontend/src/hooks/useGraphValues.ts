/**
 * Zeroed graph-values fallback.
 *
 * The live rack reads its data from the live feed directly (via
 * `useSystemMetrics()`). This constant supplies neutral blank/"—" values that
 * panels binding to `GraphValues` (FanPanel, DrivesPanel, the DISPLAY PANEL, the
 * dock, …) fall back to before the first frame lands. There is no simulation —
 * nothing here fabricates numbers.
 */
import type { GraphValues } from '@/types';

/** Neutral zero-state — all readouts blank, all sparklines empty. */
export const ZERO_GRAPH_VALUES: GraphValues = {
  cpuNow: 0, ramNow: 0, tempNow: 0, tempPct: 0, diskNow: 0,
  cpuPts: '', ramPts: '',
  netInNow: '0.0', netOutNow: '0.0', netInPts: '', netOutPts: '', netInArea: '', netOutArea: '',
  pktNow: 0, latNow: '0.0', sessNow: 0,
  voltNow: '0.0', battPct: -1, battPlugged: false, battSecsLeft: null, drawNow: 0, powerReal: false, effNow: '0.0', voltPts: '',
  iopsNow: '0.0', fanTempNow: 0, airflowNow: 0, globalPts: '',
};

/** Offline racks have no live series — always the zero-state. */
export function useGraphValues(): GraphValues {
  return ZERO_GRAPH_VALUES;
}
