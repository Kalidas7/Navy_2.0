/** Power Unit panel: total draw / efficiency cards + two PSU modules (2N redundant). */
import { useApp } from '@/app/AppContext';
import { useGraphValues } from '@/hooks/useGraphValues';
import { useSystemMetrics } from '@/app/SystemMetricsContext';
import { useComponents } from '@/hooks/useComponents';
import { StatCard } from '@/components/common/StatCard';
import { BatteryGauge } from '@/components/common/BatteryGauge';
import { NoData } from '@/components/common/NoData';
import { colors } from '@/config/tokens';
import { fmtSecsLeft } from '@/lib/format';
import { isLiveHost } from '@/data/fleet';
import type { PsuMod } from '@/types';

function PsuModule({ m, battery = false, note }: { m: PsuMod; battery?: boolean; note?: string }) {
  // The real host battery encodes charging state in `state` ("AC / CHARGING").
  const charging = /AC|CHARG|PLUG/i.test(m.state);
  return (
    <div style={{ padding: 11, marginBottom: 8, borderRadius: 8, border: `1px solid ${colors.borderInner}`, background: colors.iconTileGradient }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: battery ? 10 : 8 }}>
        <span className="cond" style={{ fontSize: 15, color: colors.textHi }}>
          {m.id}
        </span>
        <span style={{ flex: 1 }} />
        <span className="mono" style={{ fontSize: 10, color: m.color }}>
          {m.state}
        </span>
      </div>
      {battery ? (
        // For the real host battery, `volt` carries charge % (no volt sensor).
        // `note` shows the est. runtime left (discharging only; hidden on AC).
        <BatteryGauge percent={m.volt} charging={charging} note={note} />
      ) : (
        <div style={{ display: 'flex', gap: 14 }}>
          <Field label="CHARGE" value={`${m.volt}V`} />
          <Field label="LOAD" value={`${m.load}%`} />
          <Field label="TEMP" value={`${m.temp}°C`} />
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="mono" style={{ fontSize: 9, color: colors.textMuted }}>
        {label}{' '}
      </span>
      <span className="mono" style={{ fontSize: 12, color: colors.textBody }}>
        {value}
      </span>
    </div>
  );
}

export function PowerPanel() {
  const { state } = useApp();
  // localhost reads the LIVE feed; other racks use the zeroed offline values.
  const isLocal = isLiveHost(state.activeServerId);
  const offline = !isLocal;
  const live = useSystemMetrics();
  const offlineValues = useGraphValues();
  const g = isLocal ? live.g : offlineValues;
  const mods = useComponents().psuMods;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 13 }}>
        <StatCard
          label={g.powerReal ? 'POWER' : 'EST. POWER'}
          value={offline ? '—' : g.powerReal ? `${g.drawNow}` : `~${g.drawNow}`}
          color={colors.amber}
          valueSize={26}
          unit={offline ? undefined : 'W'}
          unitColor="#9aa3af"
          unitSize={12}
        />
        <StatCard label="GPU BUSY" value={offline || g.effNow === '—' ? '—' : `${g.effNow}%`} color={colors.accent} valueSize={26} />
      </div>

      <div className="mlabel" style={{ fontSize: 9.5, color: colors.textMuted, letterSpacing: '.12em', marginBottom: 9 }}>
        {offline ? 'POWER SOURCE' : 'POWER SOURCE'}
      </div>
      {mods.length === 0 && <NoData label={offline ? 'NO LIVE FEED' : 'NO SOURCE'} />}
      {mods.map((m) => (
        <PsuModule
          key={m.id}
          m={m}
          battery={!offline}
          // Est. runtime left on the battery module (discharging + known ETA
          // only; psutil reports no ETA on AC, so this hides while charging).
          note={!offline && !g.battPlugged && g.battSecsLeft != null ? fmtSecsLeft(g.battSecsLeft) : undefined}
        />
      ))}
    </>
  );
}
