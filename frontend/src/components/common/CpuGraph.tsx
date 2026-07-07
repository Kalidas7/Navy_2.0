/**
 * CPU-over-time graph on a FIXED 0–100% scale, with the safe / warn / high
 * utilisation bands shaded so the current trend can be read against them.
 *
 * Thresholds follow common server-utilisation guidance:
 *   ≤70%   safe/normal   (green band)   — steady-state with headroom
 *   70–90% elevated      (amber band)   — sustained ≥80% is worth watching
 *   >90%   high          (red band)
 * Sources: Microsoft high-CPU guidance, intramweb load-average guide.
 *
 * Pure presentation: caller passes the raw 0–100 history (oldest→newest).
 */
import { useMemo } from 'react';
import { colors } from '@/config/tokens';
import { useGraphHover, HoverCrosshair, HoverTooltip, relTime, type HoverSample } from './graphHover';

interface CpuGraphProps {
  /** raw CPU-% samples, 0–100, oldest first */
  hist: number[];
  /** current value for the readout (defaults to the last sample) */
  now?: number;
  height?: number;
}

const W = 100;
const H = 40;
const SAFE = 70; // green up to here
const WARN = 90; // amber up to here, red above

/** viewBox y for a 0–100 percent value (0% at bottom, 100% at top). */
const yFor = (pct: number) => H - (Math.max(0, Math.min(100, pct)) / 100) * H;

export function CpuGraph({ hist, now, height = 92 }: CpuGraphProps) {
  const data = hist.length ? hist : [0];
  const line = data
    .map((v, i) => `${((i / Math.max(1, data.length - 1)) * W).toFixed(1)},${yFor(v).toFixed(1)}`)
    .join(' ');
  const area = `0,${H} ${line} ${W},${H}`;
  const cur = now ?? data[data.length - 1] ?? 0;

  const ySafe = yFor(SAFE);
  const yWarn = yFor(WARN);

  // Hover: value + relative age (buffer is 1 sample/sec, newest last).
  const hoverSamples = useMemo<HoverSample[] | null>(() => {
    if (!hist.length) return null;
    const last = data.length - 1;
    return data.map((v, i) => ({
      x: (i / Math.max(1, last)) * W,
      caption: relTime(last - i, 1),
      series: [{ color: colors.accent, value: `${Math.round(v)}%`, y: yFor(v) }],
    }));
  }, [hist, data]);
  const hover = useGraphHover(hoverSamples, W);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
        <span className="mlabel" style={{ fontSize: 9, color: colors.textMuted, letterSpacing: '.12em' }}>
          CPU LOAD · 48s
        </span>
        <span className="cond" style={{ fontSize: 16, fontWeight: 700, color: colors.accent }}>
          {Math.round(cur)}
          <span style={{ fontSize: 10, color: colors.textMuted }}>%</span>
        </span>
      </div>

      <div style={{ position: 'relative', cursor: 'crosshair' }} onMouseMove={hover.onMove} onMouseLeave={hover.onLeave}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
          {/* zone bands (drawn back-to-front): safe green, warn amber, high red */}
          <rect x="0" y={ySafe} width={W} height={H - ySafe} fill={colors.accent} opacity={0.1} />
          <rect x="0" y={yWarn} width={W} height={ySafe - yWarn} fill={colors.amber} opacity={0.12} />
          <rect x="0" y="0" width={W} height={yWarn} fill={colors.red} opacity={0.1} />

          {/* threshold lines */}
          <line x1="0" y1={ySafe} x2={W} y2={ySafe} stroke={colors.accent} strokeWidth={0.4} strokeDasharray="2 2" opacity={0.6} />
          <line x1="0" y1={yWarn} x2={W} y2={yWarn} stroke={colors.amber} strokeWidth={0.4} strokeDasharray="2 2" opacity={0.6} />

          {/* CPU trace */}
          <polygon points={area} fill={colors.accent} opacity={0.14} />
          <polyline points={line} fill="none" stroke={colors.accent} strokeWidth={1.1} strokeLinejoin="round" strokeLinecap="round" />

          <HoverCrosshair hover={hover} viewH={H} />
        </svg>
        <HoverTooltip hover={hover} />
      </div>

      {/* legend */}
      <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
        <Legend color={colors.accent} label={`SAFE ≤${SAFE}%`} />
        <Legend color={colors.amber} label={`WARN ${SAFE}–${WARN}%`} />
        <Legend color={colors.red} label={`HIGH >${WARN}%`} />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 8, height: 8, background: color, opacity: 0.5, borderRadius: 1 }} />
      <span className="mono" style={{ fontSize: 8.5, color: colors.textMuted, letterSpacing: '.06em' }}>
        {label}
      </span>
    </span>
  );
}
