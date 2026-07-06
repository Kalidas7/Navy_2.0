/** Roster sidebar: per-vessel breakdown bars + status legend. */
import { colors } from '@/config/tokens';
import type { VesselStatVM } from '@/app/selectors';

const LEGEND: { label: string }[] = [
  { label: 'ONLINE · NOMINAL' },
  { label: 'WARNING' },
  { label: 'CRITICAL' },
  { label: 'STANDBY' },
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
      <div className="mlabel" style={{ fontSize: 9.5, color: colors.textMuted, letterSpacing: '.14em', marginBottom: 11 }}>
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
          <div style={{ height: 5, background: colors.borderCard }}>
            <div style={{ height: '100%', width: `${v.pct}%`, background: colors.navy }} />
          </div>
        </div>
      ))}

      <div style={{ height: 1, background: colors.borderCard, margin: '14px 0' }} />

      <div className="mlabel" style={{ fontSize: 9.5, color: colors.textMuted, letterSpacing: '.14em', marginBottom: 9 }}>
        LEGEND
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {LEGEND.map((l) => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="mono" style={{ fontSize: 10, color: colors.textMid2 }}>
              {l.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
