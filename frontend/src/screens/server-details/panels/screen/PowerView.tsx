/** Display-panel POWER tab: battery gauge, draw card, battery chart, load distribution. */
import { StatCard } from '@/components/common/StatCard';
import { BatteryGauge } from '@/components/common/BatteryGauge';
import { colors } from '@/config/tokens';
import { fmtSecsLeft } from '@/lib/format';
import type { GraphValues } from '@/types';
import type { PsuRail } from '@/types';

export function PowerView({
  g,
  rails,
  offline = false,
}: {
  g: GraphValues;
  rails: PsuRail[];
  offline?: boolean;
}) {
  // On the localhost rack the battery gauge shows real charge % (with a
  // charging bolt when on AC) and POWER shows measured/estimated watts. Offline
  // racks render "—" / an empty gauge.
  return (
    <>
      <div style={{ border: `1px solid ${colors.borderInner}`, background: colors.panelBg, padding: '10px 11px', marginBottom: 9 }}>
        <div className="mono" style={{ fontSize: 9.5, color: colors.textMuted, letterSpacing: '.12em', marginBottom: 8 }}>
          BATTERY
        </div>
        <BatteryGauge
          percent={offline ? 0 : g.battPct >= 0 ? g.battPct : 0}
          charging={!offline && g.battPlugged}
          offline={offline || g.battPct < 0}
          // Runtime-left note (discharging + known ETA only). psutil reports no
          // ETA while charging, so this naturally hides on AC.
          note={!g.battPlugged && g.battSecsLeft != null ? fmtSecsLeft(g.battSecsLeft) : undefined}
        />
      </div>

      <div style={{ marginBottom: 13 }}>
        <StatCard
          label={g.powerReal ? 'POWER' : 'EST. POWER'}
          value={offline ? '—' : g.powerReal ? `${g.drawNow}` : `~${g.drawNow}`}
          color={colors.amber}
          valueSize={26}
          unit={offline ? undefined : 'W'}
          unitColor="#7a5a2a"
        />
      </div>

      <div className="mono" style={{ fontSize: 9.5, color: colors.textMuted, letterSpacing: '.12em', marginBottom: 7 }}>
        LOAD DISTRIBUTION
      </div>
      {rails.map((r) => (
        <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
          <span className="mono" style={{ fontSize: 11, color: colors.textMid, width: 46 }}>
            {r.name}
          </span>
          <div style={{ flex: 1, height: 8, background: '#0f1d24' }}>
            <div style={{ height: '100%', width: `${r.pct}%`, background: r.color }} />
          </div>
          <span className="mono" style={{ fontSize: 10.5, color: '#7c9a90', width: 34, textAlign: 'right' }}>
            {r.pct}%
          </span>
        </div>
      ))}
    </>
  );
}
