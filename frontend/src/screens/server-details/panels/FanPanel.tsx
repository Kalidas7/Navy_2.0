/** Cooling Fans panel: intake/airflow cards + 2×2 grid of spinning fan modules. */
import { useApp } from '@/app/AppContext';
import { useGraphValues } from '@/hooks/useGraphValues';
import { useSystemMetrics } from '@/app/SystemMetricsContext';
import { StatCard } from '@/components/common/StatCard';
import { NoData } from '@/components/common/NoData';
import { colors } from '@/config/tokens';
import { isLiveHost } from '@/data/fleet';

export function FanPanel() {
  const { state } = useApp();
  // Both hooks run unconditionally (rules of hooks); localhost reads the LIVE
  // feed, every other rack uses the zeroed offline values.
  const isLocal = isLiveHost(state.activeServerId);
  const offline = !isLocal;
  const live = useSystemMetrics();
  const offlineValues = useGraphValues();
  const g = isLocal ? live.g : offlineValues;
  const fans = state.comp.fans;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 13 }}>
        <StatCard label="FAN SPEED" value={offline || g.fanTempNow < 0 ? '—' : g.fanTempNow === 0 ? 'IDLE' : `${g.fanTempNow} RPM`} color={colors.amber} valueSize={26} />
        <StatCard label="DISK I/O" value={offline ? '—' : g.airflowNow} color={colors.blue} valueSize={26} unit={offline ? undefined : ' MB/s'} unitColor="#356077" unitSize={12} />
      </div>

      <div className="mono" style={{ fontSize: 9.5, color: colors.textMuted, letterSpacing: '.12em', marginBottom: 9 }}>
        {offline ? 'FANS' : `FANS · ${fans.length}`}
      </div>
      {fans.length === 0 && <NoData label={offline ? 'NO LIVE FEED' : 'NO FANS'} />}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {fans.map((f) => (
          <div
            key={f.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              padding: 10,
              border: `1px solid ${colors.borderInner}`,
              background: colors.panelBg,
            }}
          >
            <span
              style={{
                fontSize: 24,
                color: f.color,
                display: 'inline-block',
                animation: `rkspin ${f.spin}s linear infinite`,
              }}
            >
              ❋
            </span>
            <div>
              <div className="mono" style={{ fontSize: 10, color: '#7c9a90' }}>
                {f.id}
              </div>
              <div className="cond" style={{ fontSize: 18, fontWeight: 700, color: f.color }}>
                {f.rpm === 0 ? (
                  'IDLE'
                ) : (
                  <>
                    {f.rpm} <span style={{ fontSize: 10, color: colors.textMuted2 }}>RPM</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
