/**
 * Domain types for the Naval Server Console.
 *
 * Telemetry is real: the localhost rack streams live host metrics from the
 * Django backend (psutil), and every other rack is an empty shell that renders
 * "—". Nothing is simulated client-side.
 */

export type RackStatus = 'online' | 'warn' | 'crit' | 'standby';

/** One server rack in the fleet. */
export interface Server {
  id: string;
  code: string; // e.g. "SDC-R11-04"
  vessel: string; // e.g. "INS Vikrant"
  pennant: string; // e.g. "R11"
  role: string; // e.g. "Combat Mgmt System"
  status: RackStatus;
  cpu: number;
  ram: number;
  temp: number;
  uptime: string;
  /** small ring buffer (length 24) backing the home-card sparkline */
  buf: number[];
}

/** The six selectable subsystems on the 3D rack. */
export type CompKey = 'screen' | 'status' | 'drives' | 'net' | 'fan' | 'power';

/** Per-subsystem health state. */
export type CompState = 'ok' | 'warn' | 'crit' | 'standby';

export type CompStates = Record<CompKey, CompState>;

/** Display-panel sub-tabs. */
export type ScreenView = 'system' | 'network' | 'radar' | 'power' | 'logs';

export interface CompDef {
  key: CompKey;
  label: string;
  glyph: string;
  /** world-space hotspot position tuned to the normalized rack footprint */
  pos: [number, number, number];
}

export interface DriveBay {
  id: string;
  used: number;
  temp: number;
  color: string;
}

export interface Fan {
  id: string;
  rpm: number;
  spin: number;
  color: string;
}

export interface NetPort {
  id: string;
  speed: string;
  state: 'LINK UP' | 'DOWN';
  in: string;
  out: string;
  color: string;
}

export interface PsuMod {
  id: string;
  volt: number;
  load: number;
  temp: number;
  state: string;
  color: string;
}

export interface PsuRail {
  name: string;
  pct: number;
  color: string;
}

export interface StatusItem {
  name: string;
  state: string;
  color: string;
}

export interface SonarContact {
  id: string;
  type: string;
  bearing: number;
  range: number;
  x: number;
  y: number;
  color: string;
  blink: string;
}

/** Per-rack component data shown in the rail panels. */
export interface CompData {
  driveBays: DriveBay[];
  fans: Fan[];
  netPorts: NetPort[];
  psuMods: PsuMod[];
  psuRails: PsuRail[];
  statusItems: StatusItem[];
  contacts: SonarContact[];
}

export type LogLevel = 'OK' | 'INFO' | 'WARN' | 'CRIT';

export interface LogEntry {
  id: string;
  t: string;
  lvl: LogLevel;
  msg: string;
  color: string;
}

/**
 * Per-tick values consumed by the detail view and telemetry dock.
 *
 * The localhost rack fills this from the live host feed
 * (`useSystemMetricsSource`); every other rack uses the zeroed constant
 * (`ZERO_GRAPH_VALUES`) so its readouts render blank/"—".
 */
export interface GraphValues {
  cpuNow: number;
  ramNow: number;
  tempNow: number;
  tempPct: number;
  diskNow: number;
  cpuPts: string;
  ramPts: string;
  netInNow: string;
  netOutNow: string;
  netInPts: string;
  netOutPts: string;
  netInArea: string;
  netOutArea: string;
  pktNow: number;
  latNow: string;
  sessNow: number;
  voltNow: string;
  /** battery charge percent as a number (0–100); -1 when unknown/offline */
  battPct: number;
  /** true when the host is plugged in / charging */
  battPlugged: boolean;
  /** est. battery time remaining in seconds; null when unknown/charging/offline */
  battSecsLeft: number | null;
  drawNow: number;
  /** true when drawNow is REAL measured watts (RAPL); false when it's an estimate */
  powerReal: boolean;
  effNow: string;
  voltPts: string;
  iopsNow: string;
  /** real host: fan RPM, or -1 when no fan sensor is exposed (UI shows "—") */
  fanTempNow: number;
  airflowNow: number;
  globalPts: string;
}
