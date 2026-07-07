/**
 * Line graph over PERSISTED history (from useHistory / the /system/history API).
 *
 * Unlike the live sparklines (which normalise to their own 48-sample min/max),
 * this plots a stored series across a real time window (1D / 7D / 1M / custom),
 * with a time x-axis and value y-axis. It is honest about coverage:
 *   - no rows in window        → "NO DATA YET — collecting" placeholder
 *   - buckets with no reading   → line breaks (gaps), never interpolated guesses
 *
 * Hovering the plot shows a crosshair + tooltip with the exact timestamp and
 * value of the nearest collected sample. Feeds the graphs ONLY — never the live
 * scalar readouts.
 *
 * Coordinate note: the SVG uses a fixed 100×40 viewBox with
 * preserveAspectRatio="none", so internal units are stretched to the rendered
 * pixel box by DIFFERENT factors on x and y. To stay correct we only ever use
 * the scale-independent fraction (clientX-rect.left)/rect.width: SVG children
 * (crosshair, dot) use 0..100/0..40 user units; the HTML tooltip uses pixels.
 */
import { useMemo } from 'react';
import { colors } from '@/config/tokens';
import {
  useGraphHover,
  HoverCrosshair,
  HoverTooltip,
  type HoverSample,
} from './graphHover';
import type { HistorySeries, MetricKey } from '@/api/history';

const W = 100;
const H = 40;
const PAD = 3;

/** A plotted sample retained for hover lookup (null buckets are not included). */
interface PlotPoint {
  t: number; // ms epoch
  v: number; // metric value
  x: number; // SVG x, 0..W
  y: number; // SVG y, 0..H
}

export function HistoryGraph({
  series,
  metric,
  color = colors.accent,
  unit = '',
  loading = false,
  error = false,
  /** Fixed y-range. Omit to auto-scale to the data (with a little headroom). */
  yMin,
  yMax,
  height = 120,
}: {
  series: HistorySeries | null;
  metric: MetricKey;
  color?: string;
  unit?: string;
  loading?: boolean;
  error?: boolean;
  yMin?: number;
  yMax?: number;
  height?: number;
}) {
  const model = useMemo(() => build(series, metric, yMin, yMax), [series, metric, yMin, yMax]);
  // Hoverable samples for the shared crosshair/tooltip (built from the plotted,
  // non-null points). Each carries its value + a full timestamp caption.
  const hoverSamples = useMemo<HoverSample[] | null>(() => {
    if (!model) return null;
    return model.points.map((p) => ({
      x: p.x,
      caption: fmtStamp(p.t, model.spanDays),
      series: [{ color, value: `${fmt(p.v)}${unit}`, y: p.y }],
    }));
  }, [model, color, unit]);
  const hover = useGraphHover(hoverSamples, W);

  // Empty / loading / error states — never draw a fake line.
  if (!model) {
    const msg = error
      ? 'History unavailable'
      : loading
        ? 'Loading history…'
        : 'No data yet — collecting';
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.textMuted2,
          fontSize: 11,
          letterSpacing: '.04em',
        }}
        className="mlabel"
      >
        {msg}
      </div>
    );
  }

  const { segments, lo, hi, xTicks, latest } = model;

  return (
    <div
      style={{ position: 'relative', cursor: 'crosshair' }}
      onMouseMove={hover.onMove}
      onMouseLeave={hover.onLeave}
    >
      {/* y-axis min/max labels */}
      <div
        className="mono"
        style={{ position: 'absolute', top: 0, right: 0, fontSize: 9, color: colors.textMuted2 }}
      >
        {fmt(hi)}{unit}
      </div>
      <div
        className="mono"
        style={{ position: 'absolute', bottom: 16, right: 0, fontSize: 9, color: colors.textMuted2 }}
      >
        {fmt(lo)}{unit}
      </div>
      {/* latest value badge */}
      {latest != null && (
        <div
          className="mono"
          style={{ position: 'absolute', top: 0, left: 0, fontSize: 10.5, fontWeight: 700, color }}
        >
          {fmt(latest)}{unit}
        </div>
      )}

      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height, display: 'block', marginTop: 2 }}
      >
        {/* mid gridline */}
        <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke={colors.borderInner} strokeWidth={0.4} />
        {/* one polyline per contiguous (gap-free) segment */}
        {segments.map((pts, i) => (
          <polyline
            key={i}
            points={pts}
            fill="none"
            stroke={color}
            strokeWidth={1}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {/* shared hover crosshair (SVG user units) */}
        <HoverCrosshair hover={hover} viewH={H} />
      </svg>

      {/* shared hover tooltip (HTML, positioned in PIXELS) */}
      <HoverTooltip hover={hover} />

      {/* time x-axis ticks */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        {xTicks.map((label, i) => (
          <span key={i} className="mono" style={{ fontSize: 8.5, color: colors.textMuted2 }}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

interface Model {
  segments: string[];
  lo: number;
  hi: number;
  xTicks: string[];
  latest: number | null;
  /** Non-null plotted samples, retained for hover lookup. */
  points: PlotPoint[];
  /** Window length in days, drives timestamp formatting granularity. */
  spanDays: number;
}

/** Turn a series into drawable segments + scales, or null if nothing to draw. */
function build(
  series: HistorySeries | null,
  metric: MetricKey,
  yMin?: number,
  yMax?: number,
): Model | null {
  if (!series || series.points.length === 0) return null;
  const pts = series.points;
  const vals = pts.map((p) => p[metric]).filter((v): v is number => v != null);
  if (vals.length === 0) return null;

  // y-scale: fixed if given, else auto with 8% headroom top & bottom.
  let lo = yMin ?? Math.min(...vals);
  let hi = yMax ?? Math.max(...vals);
  if (hi - lo < 1e-3) hi = lo + 1;
  if (yMin == null && yMax == null) {
    const pad = (hi - lo) * 0.08;
    lo -= pad;
    hi += pad;
  }

  // x-scale over the full WINDOW (from → to), not just the data span. This is
  // what makes the graph shrink with the time frame: a point at time p.t lands
  // at its true fraction of the window, so recent data sits on the right and the
  // empty past is left blank. Fall back to the data span only if the window
  // bounds are somehow absent (older payloads / custom edge cases).
  const t0 = series.fromMs ?? pts[0].t;
  const t1 = series.toMs ?? pts[pts.length - 1].t;
  const span = t1 - t0 || 1;

  // Break the line at null buckets so gaps show as breaks, not straight jumps.
  // Keep every non-null point (with its raw t/v and computed x/y) for hover.
  const segments: string[] = [];
  const points: PlotPoint[] = [];
  let cur: string[] = [];
  for (const p of pts) {
    const v = p[metric];
    if (v == null) {
      if (cur.length) segments.push(cur.join(' '));
      cur = [];
      continue;
    }
    // Clamp into [0,W] so a sample exactly on the window edge stays in view.
    const x = Math.min(W, Math.max(0, ((p.t - t0) / span) * W));
    const y = H - PAD - ((v - lo) / (hi - lo)) * (H - 2 * PAD);
    cur.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    points.push({ t: p.t, v, x, y });
  }
  if (cur.length) segments.push(cur.join(' '));
  if (segments.length === 0) return null;

  // Latest actual reading (last non-null bucket).
  const latest = vals[vals.length - 1];
  // Axis/tooltip formatting granularity follows the WINDOW length, not the data.
  const spanDays = (t1 - t0) / 86_400_000;

  return { segments, lo, hi, xTicks: makeTicks(t0, t1), latest, points, spanDays };
}

/** Three x-axis tick labels (start / mid / end), formatted by window length. */
function makeTicks(t0: number, t1: number): string[] {
  const spanDays = (t1 - t0) / 86_400_000;
  const label = (ms: number) => {
    const d = new Date(ms);
    if (spanDays <= 1.5) {
      // Sub-day window → clock time.
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    // Multi-day window → day + month.
    const mon = d.toLocaleString(undefined, { month: 'short' });
    return `${d.getDate()} ${mon}`;
  };
  return [label(t0), label((t0 + t1) / 2), label(t1)];
}

/** Full timestamp for the tooltip — includes the date on multi-day windows. */
function fmtStamp(ms: number, spanDays: number): string {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const clock = `${hh}:${mm}:${ss}`;
  // Sub-day windows: time is enough. Longer windows: prefix the date.
  if (spanDays <= 1.5) return clock;
  const mon = d.toLocaleString(undefined, { month: 'short' });
  return `${d.getDate()} ${mon} ${clock}`;
}

function fmt(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}
