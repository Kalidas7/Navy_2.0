/**
 * Radial temperature gauge — a 240° speedometer arc (bottom-left → top →
 * bottom-right). The arc is painted with a fixed green → amber → red gradient
 * mapped to a real Celsius scale, and the fill reveals more of that gradient as
 * the temperature climbs, so the sweep both grows AND shifts colour toward red.
 *
 * Thresholds follow published laptop-CPU guidance:
 *   ≤ ~70°C  safe/normal   (green)
 *   70–90°C  warm/elevated (amber)
 *   ≥ ~90°C  hot/throttling (red)
 * Sources: techguided.com/safe-cpu-temp, eneba CPU-temp guide, outbyte blog.
 *
 * Pure presentation: the caller supplies the raw °C value.
 */
import { colors } from '@/config/tokens';

interface TempGaugeProps {
  /** current temperature in °C */
  value: number;
  /** show "—" instead of a reading (offline racks) */
  offline?: boolean;
  size?: number;
}

// Temperature domain the arc spans end-to-end.
const T_MIN = 30;
const T_MAX = 100;
// Zone edges (°C) → also the gradient colour-stop temperatures.
const T_SAFE = 70; // green up to here
const T_WARM = 90; // amber up to here, red beyond

// Geometry: a 240° arc symmetric about the top, 120° gap centred at the bottom.
// polar() uses 0°=right, 90°=up, 180°=left, 270°=down. Start at 210° (bottom-
// left) and sweep by DECREASING angle to -30° (bottom-right), passing the top.
const SWEEP = 240;
const START = 210;
const TAU = Math.PI * 2;

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/** Fraction (0..1) of the arc for a given temperature. */
function tempFrac(t: number): number {
  return clamp01((t - T_MIN) / (T_MAX - T_MIN));
}

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = (deg / 360) * TAU;
  return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
}

/** SVG arc path from `fromDeg` sweeping `spanDeg` by decreasing angle (CW on screen). */
function arcPath(cx: number, cy: number, r: number, fromDeg: number, spanDeg: number): string {
  const [x0, y0] = polar(cx, cy, r, fromDeg);
  const [x1, y1] = polar(cx, cy, r, fromDeg - spanDeg);
  const large = spanDeg > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}

/** Solid colour for the centre readout / glow, by zone. */
function zoneColor(t: number): string {
  if (t >= T_WARM) return colors.red;
  if (t >= T_SAFE) return colors.amber;
  return colors.accent;
}

export function TempGauge({ value, offline = false, size = 120 }: TempGaugeProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 9;
  const stroke = 7;

  const frac = offline ? 0 : tempFrac(value);
  const filled = frac * SWEEP;
  const col = zoneColor(value);

  // Green→amber→red gradient whose stops are placed by ARC-LENGTH fraction (=
  // temperature fraction), matching how the fill grows. So the colour bands line
  // up with the real Celsius zones: green 30–70°C, amber 70–90°C, red 90–100°C.
  // Rendered as a horizontal gradient — the arc is symmetric (cold-left → top →
  // hot-right), so left-to-right reads correctly cold→hot.
  const off = (t: number) => `${(tempFrac(t) * 100).toFixed(1)}%`;
  const gid = 'tempgrad';

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ display: 'block', overflow: 'visible' }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={colors.accent} />
              <stop offset={off(T_SAFE)} stopColor={colors.accent} />
              <stop offset={off((T_SAFE + T_WARM) / 2)} stopColor={colors.amber} />
              <stop offset={off(T_WARM)} stopColor={colors.amber} />
              <stop offset="100%" stopColor={colors.red} />
            </linearGradient>
          </defs>
          {/* track */}
          <path
            d={arcPath(cx, cy, r, START, SWEEP)}
            fill="none"
            stroke="#122029"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          {/* filled portion — reveals the gradient up to the current temp */}
          {!offline && frac > 0 && (
            <path
              d={arcPath(cx, cy, r, START, filled)}
              fill="none"
              stroke={`url(#${gid})`}
              strokeWidth={stroke}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 4px ${col}88)`, transition: 'stroke-dasharray .3s' }}
            />
          )}
        </svg>
        {/* centre readout */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
          }}
        >
          <div className="cond" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1, color: offline ? colors.textMuted : col }}>
            {offline ? '—' : value}
            {!offline && <span style={{ fontSize: 15, color: colors.textMuted }}>°</span>}
          </div>
          <div className="mono" style={{ fontSize: 8.5, letterSpacing: '.14em', color: colors.textMuted }}>
            CORE TEMP
          </div>
        </div>
      </div>
    </div>
  );
}
