/**
 * Per-menu history configuration.
 *
 * Each subsystem menu (CompKey) maps to the set of stored metrics its non-Live
 * view should graph — i.e. the history of exactly what that menu shows live. A
 * menu mapped to an empty list renders NO history section at all (per the
 * requirement: don't show graphs on pages that have no plottable series).
 *
 *   screen → CPU / RAM / temp
 *   fan    → fan RPM / disk I/O
 *   net    → RX / TX throughput
 *   power  → watts / GPU busy / battery
 *   drives → IOPS / disk usage
 *   status → (none: per-core snapshot + process list, no single time-series)
 *
 * `metric` keys and their nullability match backend/fleet/history.py fields.
 */
import { colors } from '@/config/tokens';
import type { CompKey } from '@/types';
import type { MetricKey } from '@/api/history';

export interface GraphSpec {
  metric: MetricKey;
  /** Card heading, e.g. "CPU LOAD". */
  title: string;
  /** Unit suffix shown on values/axis, e.g. "%", "°", " Mbps". */
  unit: string;
  color: string;
  /** Fixed y-axis floor. Omit (with yMax) to auto-scale to the data. */
  yMin?: number;
  /** Fixed y-axis ceiling. */
  yMax?: number;
}

export const HISTORY_GRAPHS: Record<CompKey, GraphSpec[]> = {
  screen: [
    { metric: 'cpu', title: 'CPU LOAD', unit: '%', color: colors.accent, yMin: 0, yMax: 100 },
    { metric: 'ram', title: 'MEMORY', unit: '%', color: '#f59e0b', yMin: 0, yMax: 100 },
    { metric: 'temp', title: 'CPU TEMP', unit: '°', color: '#ef4444' },
  ],
  fan: [
    { metric: 'fan_rpm', title: 'FAN SPEED', unit: ' RPM', color: colors.amber },
    { metric: 'disk_io', title: 'DISK I/O', unit: ' MB/s', color: colors.blue },
  ],
  net: [
    { metric: 'net_rx', title: 'INGRESS', unit: ' Mbps', color: colors.accent },
    { metric: 'net_tx', title: 'EGRESS', unit: ' Mbps', color: '#f59e0b' },
  ],
  power: [
    { metric: 'power_w', title: 'POWER DRAW', unit: ' W', color: colors.amber },
    { metric: 'gpu_pct', title: 'GPU BUSY', unit: '%', color: colors.accent, yMin: 0, yMax: 100 },
    { metric: 'batt_pct', title: 'BATTERY', unit: '%', color: '#22c55e', yMin: 0, yMax: 100 },
  ],
  drives: [
    { metric: 'iops', title: 'DISK IOPS', unit: '', color: colors.accent },
    { metric: 'disk_pct', title: 'DISK USAGE', unit: '%', color: colors.blue, yMin: 0, yMax: 100 },
  ],
  // No single plottable trend — the Status view is a per-core/process snapshot.
  status: [],
};
