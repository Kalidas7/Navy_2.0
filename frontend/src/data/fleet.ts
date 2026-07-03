/**
 * Fleet scaffolding for the initial (pre-hydrate) client state.
 *
 * The fleet is a SINGLE live rack. On mount the app shows its placeholder card;
 * the backend's `/api/fleet` then replaces it with the authoritative row. The
 * rack's live data streams from the host-metrics feed. Adding another card later
 * is just another row here pointed at a 3D model — the whole app renders it with
 * the same generalized live behavior (live stats, two-stage view, focus windows).
 */
import type { Server, CompData, CompStates, LogLevel } from '@/types';
import { MODEL_DATACENTER, type ModelConfig } from '@/config/components';

/** Id of the single live-host rack (this PC), streamed from the host feed. */
export const LOCAL_HOST_ID = 'localhost-2';

/**
 * True when a rack id is backed by the live host feed. Every rack is live now
 * (the fleet is a single live rack); kept as a helper so call sites read clearly
 * and a future multi-rack fleet stays a one-line change.
 */
export function isLiveHost(id: string): boolean {
  return id === LOCAL_HOST_ID;
}

/** Which 3D model a rack renders. One model for the whole app today. */
export function modelForServer(_id: string): ModelConfig {
  return MODEL_DATACENTER;
}

/** The live-host rack representing the machine the app runs on (placeholder). */
export function localHostServer(): Server {
  return {
    id: LOCAL_HOST_ID,
    code: 'LOCAL-HOST-02',
    vessel: 'This Machine',
    pennant: 'PC',
    role: 'Live Host Telemetry',
    status: 'online',
    cpu: 0,
    ram: 0,
    temp: 0,
    uptime: '—',
    buf: [],
  };
}

/**
 * Initial fleet before the backend hydrates: the single placeholder live-host
 * rack, so the real-host card shows immediately. `/api/fleet` replaces this.
 */
export function makeInitialServers(): Server[] {
  return [localHostServer()];
}

/**
 * Neutral all-"ok" subsystem health. We never fabricate warn/crit states on the
 * client: the rack's real health shows through its component payload.
 */
export function offlineStates(): CompStates {
  return { screen: 'ok', status: 'ok', drives: 'ok', net: 'ok', fan: 'ok', power: 'ok' };
}

/** Empty component set — the pre-hydrate default. Real per-device data overlays
 *  it from the backend on entering the detail view. */
export const EMPTY_COMP: CompData = {
  driveBays: [],
  fans: [],
  netPorts: [],
  psuMods: [],
  psuRails: [],
  statusItems: [],
  contacts: [],
};

const LOG_COLORS: Record<LogLevel, string> = {
  OK: '#2bf0a0',
  INFO: '#5b86a8',
  WARN: '#ffb84d',
  CRIT: '#ff5a5a',
};

export function logColor(level: LogLevel): string {
  return LOG_COLORS[level] ?? '#2bf0a0';
}
