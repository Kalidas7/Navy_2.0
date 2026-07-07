/**
 * Shared mouse-hover behaviour for every line graph in the app.
 *
 * All graphs share a fixed 100-wide SVG viewBox rendered with
 * preserveAspectRatio="none", so internal x-units (0..100) stretch to pixels by
 * a width-only factor. This module encapsulates the one correct conversion —
 * the scale-independent fraction (clientX - rect.left)/rect.width — and the two
 * overlay layers (an SVG crosshair in user units + an HTML tooltip in pixels),
 * so no graph re-implements it.
 *
 * Usage:
 *   const hover = useGraphHover(samples, W);   // samples: HoverSample[]
 *   <div style={{position:'relative'}} onMouseMove={hover.onMove} onMouseLeave={hover.onLeave}>
 *     <svg ...>{... hover.active && crosshair ...}</svg>
 *     <GraphHoverOverlay hover={hover} viewW={W} viewH={H} />
 *   </div>
 *
 * The tooltip lists EVERY series at the hovered x (one tooltip, every series),
 * matching the dataviz interaction spec (value leads, label follows, line key).
 */
import { useState } from 'react';
import { colors } from '@/config/tokens';

/** One series' readout at a hovered x-position. */
export interface HoverSeries {
  color: string;
  /** e.g. "CPU" — the series name (secondary text). */
  label?: string;
  /** formatted value, e.g. "42%" (leading, strong text). */
  value: string;
  /** SVG y (0..viewH) of this series' point, for the dot marker. */
  y: number;
}

/** One hoverable x-position: the shared x + every series' readout there. */
export interface HoverSample {
  /** SVG x, 0..viewW */
  x: number;
  /** caption under the values, e.g. "12s ago" or "7 Jul 09:23:17" */
  caption: string;
  series: HoverSeries[];
}

export interface GraphHover {
  active: HoverSample | null;
  /** pixel x of the pointer within the plot (for the HTML tooltip position) */
  px: number;
  onMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  onLeave: () => void;
}

/**
 * Track the hovered sample nearest the pointer.
 * @param samples hoverable positions (x in 0..viewW), or null to disable.
 * @param viewW   the SVG viewBox width (100 for every graph here).
 * @param snapFrac max distance (as a fraction of width) to still show a hover;
 *                 prevents snapping to distant data over an empty region.
 */
export function useGraphHover(
  samples: HoverSample[] | null,
  viewW: number,
  snapFrac = 0.08,
): GraphHover {
  const [idx, setIdx] = useState<number | null>(null);
  const [px, setPx] = useState(0);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || !samples || samples.length === 0) return;
    const fracX = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const targetX = fracX * viewW;
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < samples.length; i++) {
      const d = Math.abs(samples[i].x - targetX);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    // Proximity guard: don't snap a tooltip to distant data across empty space.
    if (bestD > viewW * snapFrac) {
      setIdx(null);
      return;
    }
    setIdx(best);
    setPx(fracX * rect.width);
  };
  const onLeave = () => setIdx(null);

  return { active: idx != null && samples ? samples[idx] : null, px, onMove, onLeave };
}

/**
 * The SVG crosshair layer — render INSIDE the graph's <svg> (user units).
 * A thin vertical hairline at the hovered x + a dot on each series' point.
 */
export function HoverCrosshair({ hover, viewH }: { hover: GraphHover; viewH: number }) {
  const a = hover.active;
  if (!a) return null;
  return (
    <>
      <line
        x1={a.x}
        y1={0}
        x2={a.x}
        y2={viewH}
        stroke={colors.textMuted}
        strokeWidth={0.5}
        opacity={0.45}
      />
      {a.series.map((s, i) => (
        <circle key={i} cx={a.x} cy={s.y} r={1.4} fill={s.color} />
      ))}
    </>
  );
}

/**
 * The HTML tooltip layer — render as a sibling of the <svg>, inside the same
 * position:relative wrapper (positioned in PIXELS via hover.px).
 */
export function HoverTooltip({ hover }: { hover: GraphHover }) {
  const a = hover.active;
  if (!a) return null;
  return (
    <div
      className="mono"
      style={{
        position: 'absolute',
        top: 2,
        left: hover.px,
        transform: 'translateX(-50%)',
        // Content-sized (whiteSpace:nowrap) so it works for both wide history
        // graphs and narrow 110px sparklines without wrapping/clipping.
        pointerEvents: 'none',
        padding: '4px 7px',
        background: colors.panelBg,
        border: `1px solid ${colors.borderInner}`,
        borderRadius: 6,
        boxShadow: '0 4px 14px rgba(16,24,40,.14)',
        whiteSpace: 'nowrap',
        zIndex: 4,
      }}
    >
      {a.series.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 2, background: s.color, borderRadius: 1 }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: colors.textHi }}>{s.value}</span>
          {s.label && (
            <span style={{ fontSize: 9.5, color: colors.textMuted2 }}>{s.label}</span>
          )}
        </div>
      ))}
      <div style={{ fontSize: 9.5, color: colors.textMuted2, marginTop: 1 }}>{a.caption}</div>
    </div>
  );
}

/**
 * Format a live-buffer sample's age as relative time from its index in a
 * fixed-length rolling buffer. The newest sample (last index) is "now"; each
 * earlier sample is `(len-1-i) * stepSec` seconds ago.
 */
export function relTime(indexFromEnd: number, stepSec = 1): string {
  const secs = Math.round(indexFromEnd * stepSec);
  if (secs <= 0) return 'now';
  if (secs < 60) return `${secs}s ago`;
  const m = Math.round(secs / 60);
  return `${m}m ago`;
}

/** One series' inputs for buildLiveSamples: its per-point coords + formatting. */
export interface LiveSeriesInput {
  color: string;
  label?: string;
  /** raw values (oldest→newest), same length as coords */
  values: number[];
  /** {x,y} coords from sparkCoords (must align 1:1 with values) */
  coords: { x: number; y: number }[];
  /** format a value into the tooltip string, e.g. v => `${Math.round(v)}%` */
  fmt: (v: number) => string;
}

/**
 * Build hover samples for a LIVE graph (rolling 1/sec buffer) from one or more
 * series. All series must share the same sample count/x-positions (they come
 * from the same ring buffers). The caption is the sample's relative age.
 * Returns null if there's nothing to hover.
 */
export function buildLiveSamples(series: LiveSeriesInput[], stepSec = 1): HoverSample[] | null {
  const n = Math.max(0, ...series.map((s) => s.coords.length));
  if (n === 0) return null;
  const last = n - 1;
  const out: HoverSample[] = [];
  for (let i = 0; i < n; i++) {
    // x comes from the first series that has this index (all share x-positions).
    const anchor = series.find((s) => s.coords[i]);
    if (!anchor) continue;
    out.push({
      x: anchor.coords[i].x,
      caption: relTime(last - i, stepSec),
      series: series
        .filter((s) => s.coords[i] != null && s.values[i] != null)
        .map((s) => ({ color: s.color, label: s.label, value: s.fmt(s.values[i]), y: s.coords[i].y })),
    });
  }
  return out.length ? out : null;
}
