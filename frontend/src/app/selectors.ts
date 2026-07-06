/**
 * Pure selectors deriving view-model values from app state.
 * Keeps the view components thin and the derivation logic testable.
 */
import { spark } from '@/lib/sparkline';
import { statusMeta } from '@/config/tokens';
import { STATUS_PRIORITY } from './store';
import { isLiveHost } from '@/data/fleet';
import type { AppState, FilterStatus } from './store';
import type { Server, RackStatus, CompStates } from '@/types';

export interface FleetServerVM extends Server {
  statusColor: string;
  statusLabel: string;
  statusBd: string;
  statusBg: string;
  /** left accent bar colour — transparent for nominal (online) racks */
  barColor: string;
  spark: string;
  /**
   * Pre-formatted CPU/MEM/TEMP display strings. Only the localhost rack has a
   * real feed; every other rack shows "—" (no live sensor data) instead of a
   * misleading number. The localhost card overrides these with live SSE values.
   */
  cpuText: string;
  ramText: string;
  tempText: string;
}

/** Filter by query + status, then sort by severity, then decorate for display. */
export function selectFleet(state: AppState): FleetServerVM[] {
  const q = state.query.trim().toLowerCase();
  const list = state.servers.filter((s) => {
    if (state.filterStatus !== 'all' && s.status !== state.filterStatus) return false;
    if (q && !`${s.code} ${s.vessel} ${s.pennant} ${s.role}`.toLowerCase().includes(q)) return false;
    return true;
  });
  list.sort((a, b) => (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9));
  return list.map((s) => {
    const m = statusMeta(s.status);
    const isLocal = isLiveHost(s.id);
    return {
      ...s,
      statusColor: m.color,
      statusLabel: m.label,
      statusBd: m.bd,
      statusBg: m.bg,
      barColor: s.status === 'online' ? 'transparent' : m.color,
      spark: spark(s.buf, 100, 22, 2),
      // localhost's real values come from the SSE stream (see RackCard). The
      // fleet row itself is a cheap 0-placeholder, so show "—" until the first
      // live frame fills it — never a misleading "0%". Non-local racks: always "—".
      cpuText: isLocal && s.cpu ? `${s.cpu}%` : '—',
      ramText: isLocal && s.ram ? `${s.ram}%` : '—',
      tempText: isLocal && s.temp ? `${s.temp}°` : '—',
    };
  });
}

export interface FleetCounts {
  total: number;
  online: number;
  warn: number;
  crit: number;
  standby: number;
}

export function selectCounts(state: AppState): FleetCounts {
  const cnt = (st: RackStatus) => state.servers.filter((s) => s.status === st).length;
  return {
    total: state.servers.length,
    online: cnt('online'),
    warn: cnt('warn'),
    crit: cnt('crit'),
    standby: cnt('standby'),
  };
}

export interface FilterChipVM {
  key: FilterStatus;
  label: string;
  count: number;
}

export function selectFilterChips(counts: FleetCounts): FilterChipVM[] {
  return [
    { key: 'all', label: 'All', count: counts.total },
    { key: 'online', label: 'Online', count: counts.online },
    { key: 'warn', label: 'Warning', count: counts.warn },
    { key: 'crit', label: 'Critical', count: counts.crit },
  ];
}

export interface VesselStatVM {
  name: string;
  count: number;
  pct: number;
}

/** Per-vessel rack counts for the roster sidebar breakdown. */
export function selectVesselStats(state: AppState): VesselStatVM[] {
  const vmap = state.servers.reduce<Record<string, number>>((a, s) => {
    a[s.vessel] = (a[s.vessel] || 0) + 1;
    return a;
  }, {});
  const max = Math.max(1, ...Object.values(vmap));
  return Object.keys(vmap)
    .slice(0, 8)
    .map((name) => ({
      name: name.replace('INS ', ''),
      count: vmap[name],
      pct: Math.round((vmap[name] / max) * 100),
    }));
}

export function selectActiveServer(state: AppState): Server {
  return state.servers.find((s) => s.id === state.activeServerId) ?? state.servers[0];
}

/** Count of warn/crit subsystems on the active rack. */
export function selectAlertCount(compStates: CompStates): number {
  return Object.values(compStates).filter((v) => v === 'warn' || v === 'crit').length;
}
