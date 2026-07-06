/**
 * Donut/pie gauge — a full 360° ring that fills clockwise by `pct` (0–100) to
 * show a used-vs-free split (e.g. disk usage). The used arc is coloured, the
 * remainder is the dark track, and the percent sits in the centre with a small
 * caption. Pure presentation: the caller supplies the already-derived percent.
 */
import { colors } from '@/config/tokens';

interface DonutGaugeProps {
  /** 0–100 used fraction (the filled portion) */
  pct: number;
  /** big centre label; defaults to `${pct}%` */
  centerLabel?: string;
  /** small caption under the number */
  caption?: string;
  /** fill colour of the used arc */
  color?: string;
  /** show a neutral empty ring + "—" (offline racks) */
  offline?: boolean;
  size?: number;
}

export function DonutGauge({
  pct,
  centerLabel,
  caption = 'USED',
  color = colors.blue,
  offline = false,
  size = 108,
}: DonutGaugeProps) {
  const p = Math.max(0, Math.min(100, pct));
  const stroke = 11;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const dash = (p / 100) * circumference;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ display: 'block' }}>
          {/* track (free space) */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e5ea" strokeWidth={stroke} />
          {/* used arc — starts at 12 o'clock, sweeps clockwise */}
          {!offline && p > 0 && (
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference - dash}`}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ transition: 'stroke-dasharray .3s' }}
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
          <div className="cond" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, color: offline ? colors.textMuted : color }}>
            {offline ? '—' : centerLabel ?? `${Math.round(p)}%`}
          </div>
          <div className="mlabel" style={{ fontSize: 8.5, letterSpacing: '.14em', color: colors.textMuted }}>
            {caption}
          </div>
        </div>
      </div>
    </div>
  );
}
