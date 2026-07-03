/** Drives panel: IOPS / usage cards + list of real disks (localhost) or "—". */
import { useApp } from '@/app/AppContext';
import { useGraphValues } from '@/hooks/useGraphValues';
import { useSystemMetrics } from '@/app/SystemMetricsContext';
import { StatCard } from '@/components/common/StatCard';
import { NoData } from '@/components/common/NoData';
import { colors } from '@/config/tokens';
import { isLiveHost } from '@/data/fleet';

export function DrivesPanel() {
  const { state } = useApp();
  // localhost reads the LIVE feed; other racks use the zeroed offline values.
  const isLocal = isLiveHost(state.activeServerId);
  const offline = !isLocal;
  const live = useSystemMetrics();
  const offlineValues = useGraphValues();
  const g = isLocal ? live.g : offlineValues;
  const bays = state.comp.driveBays;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 13 }}>
        <StatCard label="DISK IOPS" value={offline ? '—' : `${g.iopsNow}`} color={colors.accent} valueSize={26} />
        <StatCard label="DISK USAGE" value={offline ? '—' : `${g.diskNow}%`} color={colors.accent} valueSize={26} />
      </div>

      <div className="mono" style={{ fontSize: 9.5, color: colors.textMuted, letterSpacing: '.12em', marginBottom: 8 }}>
        {offline ? 'DRIVE BAYS' : `DISKS · ${bays.length}`}
      </div>
      {bays.length === 0 && <NoData label={offline ? 'NO LIVE FEED' : 'NO DISKS'} />}
      {bays.map((d) => (
        <div
          key={d.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 10px',
            marginBottom: 6,
            border: `1px solid ${colors.borderInner}`,
            background: colors.panelBg,
          }}
        >
          <span
            style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, boxShadow: `0 0 7px ${d.color}` }}
          />
          <span className="mono" style={{ fontSize: 11, color: colors.textBody, width: 54 }}>
            {d.id}
          </span>
          <div style={{ flex: 1, height: 6, background: '#0f1d24' }}>
            <div style={{ height: '100%', width: `${d.used}%`, background: d.color }} />
          </div>
          <span className="mono" style={{ fontSize: 10, color: '#7c9a90', width: 78, textAlign: 'right' }}>
            {d.used}% · {d.temp}°C
          </span>
        </div>
      ))}
    </>
  );
}
