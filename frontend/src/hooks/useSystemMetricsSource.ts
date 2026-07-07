/**
 * Live host-machine metrics SOURCE — the one place that opens the SSE stream.
 *
 * Call this EXACTLY ONCE (from SystemMetricsProvider). Everything else reads the
 * result through `useSystemMetrics()` (the context consumer), so there is a
 * single subscription and a single set of ring buffers = one source of truth.
 *
 * It:
 *   - subscribes to the backend's real psutil feed (SSE, polling fallback)
 *   - maintains client-side ring buffers (length 48) so the sparkline charts
 *     animate from real history, exactly like the sim did
 *   - derives a `GraphValues`-shaped object so `TelemetryDock` and the detail
 *     panels consume real data with no component changes
 *   - exposes a short `cardSpark` history so the home card's mini sparkline can
 *     render the same real CPU trend the detail view shows
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { spark } from '@/lib/sparkline';
import { subscribeSystem, type SystemMetrics, type SystemStatus } from '@/api/system';
import type { GraphValues, CompData } from '@/types';

const LEN = 48;

/** Push a value onto a fixed-length ring buffer (mutates + returns it). */
function push(buf: number[], v: number): number[] {
  buf.push(v);
  if (buf.length > LEN) buf.shift();
  return buf;
}

export interface LiveMetrics {
  /** Latest raw snapshot, or null before the first frame arrives. */
  raw: SystemMetrics | null;
  status: SystemStatus;
  /** Derived values matching the shape the UI already binds to (detail view). */
  g: GraphValues;
  /** Raw CPU-% history (0–100, up to 48 samples) for fixed-scale graphs. */
  cpuHist: number[];
  /**
   * Raw ring-buffer histories (oldest→newest, up to 48 samples) for the live
   * graphs' hover tooltips — the polyline strings alone can't be reversed back
   * into values, so the graphs read these to show per-sample readouts.
   */
  hist: {
    cpu: number[];
    ram: number[];
    netIn: number[];
    netOut: number[];
  };
  /** Per-device component payload from the latest SSE frame, or null before it. */
  components: CompData | null;
  /**
   * Scalars + a short spark string for the home dashboard CARD, so the card and
   * the detail view render from the same live buffers. Null before first frame.
   */
  card: {
    cpu: number;
    ram: number;
    temp: number;
    /** polyline points for the card's mini CPU sparkline */
    spark: string;
  } | null;
}

/** A neutral zero-state so the UI renders before the first frame lands. */
const EMPTY_G: GraphValues = {
  cpuNow: 0, ramNow: 0, tempNow: 0, tempPct: 0, diskNow: 0,
  cpuPts: '', ramPts: '',
  netInNow: '0.0', netOutNow: '0.0', netInPts: '', netOutPts: '', netInArea: '', netOutArea: '',
  pktNow: 0, latNow: '0.0', sessNow: 0,
  voltNow: '0.0', battPct: -1, battPlugged: false, battSecsLeft: null, drawNow: 0, powerReal: false, effNow: '0.0', voltPts: '',
  iopsNow: '0.0', fanTempNow: 0, airflowNow: 0, globalPts: '',
};

export function useSystemMetricsSource(): LiveMetrics {
  const [raw, setRaw] = useState<SystemMetrics | null>(null);
  const [status, setStatus] = useState<SystemStatus>('connecting');

  // Ring buffers live in a ref (outside render state) like the simulation's.
  const buf = useRef({
    cpu: [] as number[],
    ram: [] as number[],
    temp: [] as number[],
    netIn: [] as number[],
    netOut: [] as number[],
    iops: [] as number[],
    batt: [] as number[],
    global: [] as number[],
  });

  useEffect(() => {
    const unsub = subscribeSystem({
      onStatus: setStatus,
      onData: (m) => {
        const b = buf.current;
        push(b.cpu, m.cpu.pct);
        push(b.ram, m.mem.pct);
        push(b.temp, m.cpu.tempC ?? 0);
        push(b.netIn, m.net.rxMbps);
        push(b.netOut, m.net.txMbps);
        push(b.iops, m.disk.iops);
        // Real battery-charge history for the POWER tab's trend line.
        push(b.batt, m.battery?.percent ?? 0);
        // "global" = overall system load proxy (avg of cpu & ram).
        push(b.global, (m.cpu.pct + m.mem.pct) / 2);
        setRaw(m);
      },
    });
    return unsub;
  }, []);

  const g = useMemo<GraphValues>(() => {
    if (!raw) return EMPTY_G;
    const b = buf.current;
    const temp = raw.cpu.tempC ?? 0;
    // Power: prefer REAL measured watts from Intel RAPL (raw.powerW) when the
    // backend can read the counter; otherwise fall back to a rough estimate
    // (8W idle + CPU-scaled + GPU watts). `powerReal` tells the UI which it is
    // so it can label "POWER" vs "EST. POWER".
    const powerReal = raw.powerW != null;
    const drawW = powerReal
      ? Math.round(raw.powerW as number)
      : Math.round(8 + (raw.cpu.pct / 100) * 32 + (raw.gpu?.powerW ?? 0));
    // Net polylines: compute once, reuse for both the line and its filled area.
    const netInPts = spark(b.netIn, 100, 38, 3);
    const netOutPts = spark(b.netOut, 100, 38, 3);
    return {
      cpuNow: Math.round(raw.cpu.pct),
      ramNow: Math.round(raw.mem.pct),
      tempNow: Math.round(temp),
      tempPct: Math.min(100, Math.round(((temp - 30) / 60) * 100)),
      diskNow: Math.round(raw.disk.pct),
      cpuPts: spark(b.cpu, 100, 38, 3),
      ramPts: spark(b.ram, 100, 38, 3),
      netInNow: raw.net.rxMbps.toFixed(1),
      netOutNow: raw.net.txMbps.toFixed(1),
      // Compute each polyline once and reuse it for the matching filled area
      // (was calling spark() twice per series — same input, wasted work).
      netInPts: netInPts,
      netOutPts: netOutPts,
      netInArea: netInPts + ' 100,38 0,38',
      netOutArea: netOutPts + ' 100,38 0,38',
      pktNow: raw.net.rxPps + raw.net.txPps,
      latNow: (raw.cpu.load?.[0] ?? 0).toFixed(2),
      sessNow: raw.topCpu.length,
      voltNow: raw.battery ? raw.battery.percent.toFixed(0) : '—',
      battPct: raw.battery ? Math.round(raw.battery.percent) : -1,
      battPlugged: raw.battery?.plugged ?? false,
      // Est. runtime left (seconds), or null when charging / unknown / no battery.
      battSecsLeft: raw.battery?.secsLeft ?? null,
      drawNow: drawW,
      powerReal,
      // Real GPU busy %, or "—" when no GPU telemetry (it's off by default —
      // needs root). Do NOT fall back to CPU frequency (MHz) — that would render
      // a clock speed mislabeled as "GPU BUSY %".
      effNow: raw.gpu?.busyPct != null ? raw.gpu.busyPct.toFixed(1) : '—',
      // Repurposed: real battery-% history (was a mislabeled "bus voltage").
      voltPts: spark(b.batt, 100, 38, 4),
      iopsNow: raw.disk.iops.toFixed(0),
      // Real fan RPM. 0 = sensor present but fan idle/stopped (UI shows "IDLE");
      // -1 = no fan sensor at all (UI shows "—"). Do NOT fall back to a
      // temperature-derived guess — that would mislabel a fabricated number as
      // a real RPM reading.
      fanTempNow: raw.fanRpm ?? -1,
      airflowNow: Math.round(raw.disk.readMbps + raw.disk.writeMbps),
      globalPts: spark(b.global, 100, 30, 3),
    };
  }, [raw]);

  const card = useMemo<LiveMetrics['card']>(() => {
    if (!raw) return null;
    return {
      cpu: Math.round(raw.cpu.pct),
      ram: Math.round(raw.mem.pct),
      temp: Math.round(raw.cpu.tempC ?? 0),
      // Match the home card's Sparkline geometry (viewBox 100×30, see RackCard).
      spark: spark(buf.current.cpu, 100, 30, 2),
    };
  }, [raw]);

  // Snapshot the raw CPU-% ring buffer each frame (fixed 0–100 scale graphs).
  const cpuHist = useMemo<number[]>(() => buf.current.cpu.slice(), [raw]);

  // Snapshot the buffers the live graphs' hover tooltips read (copied so the
  // consuming graphs get a stable array reference per frame).
  const hist = useMemo<LiveMetrics['hist']>(() => ({
    cpu: buf.current.cpu.slice(),
    ram: buf.current.ram.slice(),
    netIn: buf.current.netIn.slice(),
    netOut: buf.current.netOut.slice(),
  }), [raw]);

  // Per-device components ride along on each SSE frame (single source of truth).
  const components = useMemo<CompData | null>(() => raw?.components ?? null, [raw]);

  return { raw, status, g, card, cpuHist, hist, components };
}
