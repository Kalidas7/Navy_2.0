/** Bottom telemetry dock: rack draw / fan / uplink + live-status indicator. */
import { colors } from '@/config/tokens';
import type { GraphValues } from '@/types';

function DockStat({
  label,
  value,
  color,
  paddingRight,
  paddingX,
}: {
  label: string;
  value: React.ReactNode;
  color: string;
  paddingRight?: number;
  paddingX?: number;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        paddingRight: paddingRight ?? undefined,
        padding: paddingX != null ? `0 ${paddingX}px` : undefined,
        borderRight: `1px solid ${colors.borderCard}`,
      }}
    >
      <span className="mlabel" style={{ fontSize: 9, color: colors.textMuted, letterSpacing: '.12em' }}>
        {label}
      </span>
      <span className="cond" style={{ fontSize: 19, fontWeight: 700, color, lineHeight: 1 }}>
        {value}
      </span>
    </div>
  );
}

export function TelemetryDock({
  g,
  live = false,
  status,
  offline = false,
}: {
  g: GraphValues;
  /** True when values come from the real host feed rather than the simulation. */
  live?: boolean;
  /** SSE/poll connection status, shown when `live`. */
  status?: string;
  /** True for racks with no live feed (all non-localhost) → show "—". */
  offline?: boolean;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 64,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        background: colors.panelBg,
        borderTop: `1px solid ${colors.borderChrome}`,
        pointerEvents: 'auto',
        zIndex: 4,
      }}
    >
      <DockStat
        label={live ? 'PWR DRAW' : 'RACK DRAW'}
        value={offline ? '—' : `${g.drawNow} W`}
        color={colors.amber}
        paddingRight={18}
      />
      {/* Real host `fanTempNow`: >0 RPM, 0 = present-but-idle ("IDLE"), -1 = no sensor ("—"). */}
      <DockStat
        label={live ? 'FAN' : 'INTAKE'}
        value={offline || g.fanTempNow < 0 ? '—' : g.fanTempNow === 0 ? 'IDLE' : `${g.fanTempNow} RPM`}
        color={colors.accent}
        paddingX={18}
      />
      {/* UPLINK: real up-throughput for the host, static rack speed otherwise. */}
      <DockStat
        label={live ? 'NET ↑' : 'UPLINK'}
        value={offline ? '—' : live ? `${g.netOutNow} Mb/s` : '10G'}
        color={colors.blue}
        paddingX={18}
      />

      {/* flexible spacer — pushes the live-status indicator to the right */}
      <div style={{ flex: 1 }} />

      <div
        className="mono"
        style={{
          fontSize: 10,
          color: live ? '#16a34a' : colors.textMuted2,
          letterSpacing: '.1em',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {live && (
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: status === 'live' || status === 'polling' ? '#16a34a' : colors.amber,
            }}
          />
        )}
        {live ? `HOST TELEMETRY · ${(status ?? 'connecting').toUpperCase()}` : 'NDS-CMS v7.2 · SIM'}
      </div>
    </div>
  );
}
