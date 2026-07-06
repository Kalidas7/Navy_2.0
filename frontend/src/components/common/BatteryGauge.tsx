/**
 * Battery pictogram — a horizontal battery body (with the terminal nub) that
 * fills left-to-right by charge percent, coloured by level (green / amber / red)
 * and overlaid with a ⚡ bolt when charging or on AC. Pure presentation.
 */
import { colors } from '@/config/tokens';

interface BatteryGaugeProps {
  /** 0–100 charge percent */
  percent: number;
  /** true when plugged in / charging (renders the bolt + AC label) */
  charging?: boolean;
  /** show "—" instead of a reading (offline racks) */
  offline?: boolean;
  /** optional caption below, e.g. "2h 14m left" */
  note?: string;
}

function battColor(pct: number, charging: boolean): string {
  if (charging) return colors.accent;
  if (pct <= 15) return colors.red;
  if (pct <= 35) return colors.amber;
  return colors.accent;
}

export function BatteryGauge({ percent, charging = false, offline = false, note }: BatteryGaugeProps) {
  const p = Math.max(0, Math.min(100, percent));
  const col = offline ? colors.textMuted2 : battColor(p, charging);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* battery body */}
        <div
          style={{
            position: 'relative',
            flex: 1,
            height: 34,
            border: `1.5px solid ${colors.borderIcon}`,
            background: '#f4f6f8',
            padding: 3,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {/* fill */}
          <div
            style={{
              height: '100%',
              width: offline ? '0%' : `${p}%`,
              background: `linear-gradient(90deg, ${col}cc, ${col})`,
              transition: 'width .35s ease, background .3s',
            }}
          />
          {/* charging bolt, centred over the cell */}
          {!offline && charging && (
            <span
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%,-50%)',
                fontSize: 18,
                color: '#ffffff',
                textShadow: '0 1px 2px rgba(16,24,40,.35)',
                lineHeight: 1,
              }}
            >
              ⚡
            </span>
          )}
        </div>
        {/* terminal nub */}
        <div style={{ width: 4, height: 14, background: colors.borderInput, marginLeft: -6 }} />
        {/* numeric readout */}
        <div className="cond" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, color: offline ? colors.textMuted : col, width: 66, textAlign: 'right' }}>
          {offline ? '—' : p}
          {!offline && <span style={{ fontSize: 13, color: colors.textMuted }}>%</span>}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span className="mlabel" style={{ fontSize: 9, letterSpacing: '.12em', color: colors.textMuted }}>
          {charging && !offline ? 'AC · CHARGING' : 'ON BATTERY'}
        </span>
        {note && !offline && (
          <span className="mono" style={{ fontSize: 9, color: colors.textMuted2 }}>
            {note}
          </span>
        )}
      </div>
    </div>
  );
}
