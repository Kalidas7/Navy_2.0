/**
 * Frontend-only data SIMULATOR for the 'web' demo mode (see config/dataMode.ts).
 *
 * ⚠️ SIMULATED DATA — NOT REAL READINGS. This module exists ONLY for the static,
 * backend-free web demo. It generates values in the EXACT shapes the Django
 * backend returns (SystemMetrics / CompData / LogEntry[] / HistorySeries) so the
 * whole UI — cards, gauges, device panels, 3D hotspots, logs, history graphs —
 * renders and animates with plausible moving data and zero `/api` calls.
 *
 * It is deliberately quarantined here and only reachable when VITE_DATA_MODE=web.
 * The 'live' path never imports or runs any of this. A visible DemoBanner labels
 * the mode so simulated data is never mistaken for a real sensor reading
 * (CLAUDE.md data-honesty rule).
 *
 * Movement model: each metric is a bounded RANDOM WALK (small step per tick,
 * clamped to a realistic range) rather than an independent random draw, so the
 * sparklines and gauges drift smoothly like a real machine instead of flickering.
 */
import type {
  SystemMetrics,
  SystemStatus,
  SubscribeHandlers,
} from '@/api/system';
import type {
  CompData,
  DriveBay,
  Fan,
  NetPort,
  PsuMod,
  PsuRail,
  StatusItem,
  SonarContact,
  LogEntry,
  LogLevel,
  Server,
} from '@/types';
import type { HistoryPoint, HistoryRange, HistorySeries } from '@/api/history';
import { localHostServer, logColor } from '@/data/fleet';

// ---------------------------------------------------------------------------
// Small deterministic-ish helpers (no crypto; plain Math.random is fine for a
// visual demo). All movement is a bounded random walk.
// ---------------------------------------------------------------------------

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** Nudge `v` by up to ±`step`, clamped to [min, max]. The core walk primitive. */
function walk(v: number, step: number, min: number, max: number): number {
  const next = v + rand(-step, step);
  return Math.min(max, Math.max(min, next));
}

const GREEN = '#16a34a';
const AMBER = '#d97706';
const RED = '#dc2626';
const GREY = '#64748b';
const BLUE = '#3b82f6';

/** Green/amber/red by two thresholds (used for load/temp coloring). */
function band(v: number, warn: number, crit: number): string {
  if (v >= crit) return RED;
  if (v >= warn) return AMBER;
  return GREEN;
}

// ---------------------------------------------------------------------------
// Mutable simulation state (module singleton — one walk shared per page load).
// ---------------------------------------------------------------------------

const CORES = 8;

const state = {
  cpu: 18,
  perCore: Array.from({ length: CORES }, () => rand(8, 28)),
  memPct: 41,
  swapPct: 2,
  diskPct: 55,
  diskRead: 1.2,
  diskWrite: 0.4,
  iops: 60,
  netRx: 0.6,
  netTx: 0.4,
  rxPps: 60,
  txPps: 40,
  fanRpm: 1180,
  battPct: 82,
  battPlugged: true,
  powerW: 24,
  gpuBusy: 6,
  uptimeSec: 4200,
  driveTemps: [31, 34],
};

// ---------------------------------------------------------------------------
// Frame builder — one SystemMetrics snapshot (scalars + full components).
// ---------------------------------------------------------------------------

function uptimeStr(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function stepState(): void {
  state.cpu = walk(state.cpu, 6, 2, 96);
  state.perCore = state.perCore.map((c) => walk(c, 10, 0, 100));
  state.memPct = walk(state.memPct, 1.5, 20, 88);
  state.swapPct = walk(state.swapPct, 0.4, 0, 20);
  state.diskPct = walk(state.diskPct, 0.05, 40, 75);
  state.diskRead = walk(state.diskRead, 1.5, 0, 40);
  state.diskWrite = walk(state.diskWrite, 0.8, 0, 25);
  state.iops = walk(state.iops, 30, 0, 400);
  state.netRx = walk(state.netRx, 0.6, 0, 24);
  state.netTx = walk(state.netTx, 0.5, 0, 18);
  state.rxPps = Math.round(walk(state.rxPps, 30, 0, 800));
  state.txPps = Math.round(walk(state.txPps, 25, 0, 600));
  state.fanRpm = Math.round(walk(state.fanRpm, 60, 700, 2600));
  state.gpuBusy = walk(state.gpuBusy, 8, 0, 90);
  state.powerW = walk(state.powerW, 3, 8, 65);
  state.uptimeSec += 1;
  // Battery slowly drains/charges depending on plugged state.
  state.battPct = walk(state.battPct, 0.1, 5, 100);
  state.driveTemps = state.driveTemps.map((t) => walk(t, 0.6, 24, 55));
}

/** Derived CPU package temperature from load (no real sensor in the demo). */
function cpuTemp(): number {
  return Math.round(38 + (state.cpu / 100) * 34); // ~38–72 °C
}

function simComponentsFromState(): CompData {
  const driveBays: DriveBay[] = [
    {
      id: 'Boot (EFI)',
      used: Math.round(state.diskPct * 0.2),
      temp: Math.round(state.driveTemps[0]),
      color: GREEN,
    },
    {
      id: 'Data (ext4)',
      used: Math.round(state.diskPct),
      temp: Math.round(state.driveTemps[1]),
      color: band(state.diskPct, 80, 92),
    },
  ];

  const fans: Fan[] = [
    {
      id: 'FAN-1',
      rpm: state.fanRpm,
      spin: +(state.fanRpm / 600).toFixed(2),
      color: band(state.fanRpm, 2200, 2500),
    },
  ];

  const netPorts: NetPort[] = [
    {
      id: 'Ethernet (enp0s31f6)',
      speed: '—',
      state: 'DOWN',
      in: '—',
      out: '—',
      color: GREY,
    },
    {
      id: 'Wi-Fi (wlp3s0)',
      speed: '866 Mb/s',
      state: 'LINK UP',
      in: state.netRx.toFixed(1),
      out: state.netTx.toFixed(1),
      color: GREEN,
    },
  ];

  const psuMods: PsuMod[] = [
    {
      id: 'BATTERY',
      volt: +state.battPct.toFixed(0),
      load: Math.round(state.battPct),
      temp: 0,
      state: state.battPlugged ? 'AC / CHARGING' : 'ON BATTERY',
      color: band(100 - state.battPct, 60, 85),
    },
  ];

  const psuRails: PsuRail[] = [
    { name: 'BATTERY', pct: Math.round(state.battPct), color: band(100 - state.battPct, 60, 85) },
    { name: 'CPU RAIL', pct: Math.round(state.cpu), color: band(state.cpu, 75, 90) },
    { name: 'GPU RAIL', pct: Math.round(state.gpuBusy), color: band(state.gpuBusy, 70, 88) },
  ];

  const cpuState = state.cpu >= 90 ? 'CRITICAL' : state.cpu >= 75 ? 'ELEVATED' : 'NOMINAL';
  const statusItems: StatusItem[] = [
    { name: 'CPU', state: cpuState, color: band(state.cpu, 75, 90) },
    { name: 'MEMORY', state: state.memPct >= 85 ? 'ELEVATED' : 'NOMINAL', color: band(state.memPct, 80, 92) },
    { name: 'STORAGE', state: 'NOMINAL', color: band(state.diskPct, 80, 92) },
    { name: 'NETWORK', state: 'NOMINAL', color: GREEN },
    { name: 'THERMAL', state: cpuTemp() >= 80 ? 'ELEVATED' : 'NOMINAL', color: band(cpuTemp(), 75, 88) },
  ];

  // A few slow-drifting sonar contacts for the RADAR view.
  const contacts: SonarContact[] = SONAR.map((c) => ({
    ...c,
    bearing: Math.round((c.bearing + rand(-2, 2) + 360) % 360),
  }));

  return { driveBays, fans, netPorts, psuMods, psuRails, statusItems, contacts };
}

// Stable-ish sonar contacts; only bearing drifts each frame.
const SONAR: SonarContact[] = [
  { id: 'S-01', type: 'SURFACE', bearing: 45, range: 12, x: 0.3, y: -0.4, color: GREEN, blink: 'none' },
  { id: 'S-02', type: 'SUBSURFACE', bearing: 130, range: 6, x: -0.5, y: 0.2, color: AMBER, blink: 'rkblink 1.4s infinite' },
  { id: 'A-07', type: 'AIR', bearing: 300, range: 22, x: 0.1, y: 0.6, color: BLUE, blink: 'none' },
];

/** Build one full SystemMetrics frame from the current (already-stepped) state. */
function buildFrame(): SystemMetrics {
  return {
    ts: Date.now() / 1000,
    host: 'web-demo',
    uptime: uptimeStr(state.uptimeSec),
    cpu: {
      pct: +state.cpu.toFixed(1),
      perCore: state.perCore.map((c) => +c.toFixed(1)),
      cores: CORES,
      freqMhz: Math.round(rand(1600, 3800)),
      freqMaxMhz: 3800,
      load: [
        +(state.cpu / 25).toFixed(2),
        +(state.cpu / 30).toFixed(2),
        +(state.cpu / 35).toFixed(2),
      ] as [number, number, number],
      tempC: cpuTemp(),
    },
    mem: {
      pct: +state.memPct.toFixed(1),
      usedGb: +((state.memPct / 100) * 16).toFixed(1),
      totalGb: 16,
      swapPct: +state.swapPct.toFixed(1),
    },
    disk: {
      pct: +state.diskPct.toFixed(1),
      usedGb: +((state.diskPct / 100) * 250).toFixed(1),
      totalGb: 250,
      readMbps: +state.diskRead.toFixed(2),
      writeMbps: +state.diskWrite.toFixed(2),
      iops: Math.round(state.iops),
    },
    net: {
      rxMbps: +state.netRx.toFixed(2),
      txMbps: +state.netTx.toFixed(2),
      rxPps: state.rxPps,
      txPps: state.txPps,
    },
    fanRpm: state.fanRpm,
    battery: {
      percent: +state.battPct.toFixed(1),
      plugged: state.battPlugged,
      secsLeft: state.battPlugged ? null : Math.round((state.battPct / 100) * 3 * 3600),
    },
    gpu: { busyPct: +state.gpuBusy.toFixed(1), powerW: null },
    powerW: +state.powerW.toFixed(1),
    topCpu: TOP_PROCS.map((p) => ({ ...p, cpu: +walk(p.cpu, 4, 0, 60).toFixed(1) })),
    components: simComponentsFromState(),
  };
}

const TOP_PROCS = [
  { pid: 1421, name: 'node', cpu: 9.2, mem: 3.1 },
  { pid: 887, name: 'chrome', cpu: 6.4, mem: 5.8 },
  { pid: 233, name: 'code', cpu: 4.1, mem: 2.2 },
  { pid: 91, name: 'systemd', cpu: 1.0, mem: 0.4 },
];

// ---------------------------------------------------------------------------
// Public API — mirrors the real transport signatures so the seams can swap.
// ---------------------------------------------------------------------------

/**
 * Drop-in replacement for `subscribeSystem` in web-demo mode. Emits one
 * simulated frame per second and reports status 'live' (the demo is always
 * "connected" to its own simulator). Returns an unsubscribe function.
 */
export function simulateSystem({ onData, onStatus }: SubscribeHandlers): () => void {
  let stopped = false;
  const status = (s: SystemStatus) => { if (!stopped) onStatus?.(s); };

  status('connecting');
  // Emit the first frame promptly so the UI isn't blank.
  stepState();
  onData(buildFrame());
  status('live');

  const timer = setInterval(() => {
    if (stopped) return;
    stepState();
    onData(buildFrame());
  }, 1000);

  return () => {
    stopped = true;
    clearInterval(timer);
  };
}

/** Web-demo fleet: the single demo rack (relabelled so it reads as a demo host). */
export function simFleet(): Server[] {
  const s = localHostServer();
  return [{ ...s, vessel: 'Web Demo Host', role: 'Simulated Telemetry (Demo)' }];
}

/** Web-demo per-device components for a rack (same builder the frames use). */
export function simComponents(): CompData {
  return simComponentsFromState();
}

/** Web-demo log backlog — a rolling set of plausible system log lines. */
export function simLogs(): LogEntry[] {
  const now = Date.now();
  return LOG_TEMPLATES.map((tpl, i) => {
    const d = new Date(now - i * 37_000);
    const t = d.toTimeString().slice(0, 8);
    return { id: `sim${i}`, t, lvl: tpl.lvl, msg: tpl.msg, color: logColor(tpl.lvl) };
  });
}

const LOG_TEMPLATES: { lvl: LogLevel; msg: string }[] = [
  { lvl: 'INFO', msg: 'systemd: Reached target Graphical Interface.' },
  { lvl: 'OK', msg: 'NetworkManager: wlp3s0 connected (866 Mb/s).' },
  { lvl: 'INFO', msg: 'kernel: thermal zone x86_pkg_temp nominal.' },
  { lvl: 'WARN', msg: 'upowerd: battery discharge rate above nominal.' },
  { lvl: 'INFO', msg: 'cron: session opened for user root.' },
  { lvl: 'OK', msg: 'sshd: accepted publickey for demo from 10.0.0.4.' },
  { lvl: 'INFO', msg: 'kernel: EXT4-fs (sda2): re-mounted. Opts: (null).' },
  { lvl: 'CRIT', msg: 'watchdog: simulated high-load event (demo).' },
  { lvl: 'INFO', msg: 'dbus-daemon: successfully activated service.' },
  { lvl: 'OK', msg: 'systemd-logind: new session for user demo.' },
];

/**
 * Web-demo history series. Generates bucket-averaged points across the requested
 * window using the same random-walk feel so the 1D/7D/1M graphs render a
 * believable trend. Every field the graphs might plot is populated.
 */
export function simHistory(
  range: HistoryRange,
  opts?: { from?: number; to?: number },
): HistorySeries {
  const now = Date.now();
  let fromMs: number;
  let toMs = now;
  if (range === 'custom' && opts?.from != null && opts?.to != null) {
    fromMs = opts.from;
    toMs = opts.to;
  } else {
    const span = range === '7d' ? 7 * 864e5 : range === '1m' ? 30 * 864e5 : 864e5; // 1d default
    fromMs = now - span;
  }

  const POINTS = 96; // renderable resolution
  const stepMs = (toMs - fromMs) / POINTS;

  // Seed walkers for a smooth historical trend.
  let cpu = rand(15, 45);
  let ram = rand(30, 60);
  let temp = rand(45, 62);
  let fan = rand(1000, 1600);
  let dio = rand(1, 8);
  let rx = rand(0.5, 6);
  let tx = rand(0.3, 4);
  let pw = rand(15, 35);
  let gpu = rand(2, 20);
  let batt = rand(60, 95);
  let iops = rand(30, 120);
  let dpct = rand(50, 60);

  const points: HistoryPoint[] = [];
  for (let i = 0; i < POINTS; i++) {
    cpu = walk(cpu, 5, 3, 95);
    ram = walk(ram, 3, 22, 86);
    temp = walk(temp, 2, 40, 82);
    fan = walk(fan, 80, 700, 2500);
    dio = walk(dio, 2, 0, 30);
    rx = walk(rx, 1, 0, 22);
    tx = walk(tx, 0.8, 0, 16);
    pw = walk(pw, 2.5, 8, 60);
    gpu = walk(gpu, 6, 0, 85);
    batt = walk(batt, 0.5, 20, 100);
    iops = walk(iops, 20, 0, 350);
    dpct = walk(dpct, 0.1, 45, 70);
    points.push({
      t: Math.round(fromMs + i * stepMs),
      cpu: +cpu.toFixed(1),
      ram: +ram.toFixed(1),
      temp: +temp.toFixed(1),
      fan_rpm: Math.round(fan),
      disk_io: +dio.toFixed(2),
      net_rx: +rx.toFixed(2),
      net_tx: +tx.toFixed(2),
      power_w: +pw.toFixed(1),
      power_est: false,
      gpu_pct: +gpu.toFixed(1),
      batt_pct: Math.round(batt),
      iops: Math.round(iops),
      disk_pct: +dpct.toFixed(1),
    });
  }

  return {
    range,
    from: new Date(fromMs).toISOString(),
    to: new Date(toMs).toISOString(),
    fromMs,
    toMs,
    count: POINTS,
    points,
  };
}
