/** Roster sidebar: per-vessel breakdown bars + status legend. */
import { colors } from '@/config/tokens';
import type { VesselStatVM } from '@/app/selectors';

const LEGEND: { color: string; label: string }[] = [
  { color: '#2bf0a0', label: 'ONLINE · NOMINAL' },
  { color: '#ffb84d', label: 'WARNING' },
  { color: '#ff5a5a', label: 'CRITICAL' },
  { color: '#5b86a8', label: 'STANDBY' },
];

export function RosterSidebar({ vessels }: { vessels: VesselStatVM[] }) {
  return (
    <div
      style={{
        width: 230,
        flexShrink: 0,
        border: `1px solid ${colors.borderCard}`,
        background: colors.panelBg,
        padding: 15,
        position: 'sticky',
        top: 0,
      }}
    >
      <div className="mono" style={{ fontSize: 9.5, color: colors.textMuted, letterSpacing: '.14em', marginBottom: 11 }}>
        FLEET BREAKDOWN
      </div>
      {vessels.map((v) => (
        <div key={v.name} style={{ marginBottom: 11 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span className="mono" style={{ fontSize: 10.5, color: colors.textMid }}>
              {v.name}
            </span>
            <span className="mono" style={{ fontSize: 10, color: colors.textMuted }}>
              {v.count}
            </span>
          </div>
          <div style={{ height: 5, background: '#0f1d24' }}>
            <div style={{ height: '100%', width: `${v.pct}%`, background: colors.navy }} />
          </div>
        </div>
      ))}

      <div style={{ height: 1, background: colors.borderCard, margin: '14px 0' }} />

      <div className="mono" style={{ fontSize: 9.5, color: colors.textMuted, letterSpacing: '.14em', marginBottom: 9 }}>
        LEGEND
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {LEGEND.map((l) => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
            <span className="mono" style={{ fontSize: 10, color: '#7c9a90' }}>
              {l.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
