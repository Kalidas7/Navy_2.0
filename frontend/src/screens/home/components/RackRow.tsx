/**
 * Roster-layout rack row. Per the prototype, this view keeps the original
 * treatment: CPU green, MEM blue, accent bar always coloured by status.
 */
import { useMemo } from 'react';
import { useApp } from '@/app/AppContext';
import { useSystemMetrics } from '@/app/SystemMetricsContext';
import { Sparkline } from '@/components/common/Sparkline';
import { spark, sparkCoords } from '@/lib/sparkline';
import { isLiveHost } from '@/data/fleet';
import { colors } from '@/config/tokens';
import type { FleetServerVM } from '@/app/selectors';

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div className="mono" style={{ fontSize: 8.5, color: colors.textMuted2 }}>
        {label}
      </div>
      <div className="cond" style={{ fontSize: 16, fontWeight: 700, color }}>
        {value}
      </div>
    </div>
  );
}

export function RackRow({ server }: { server: FleetServerVM }) {
  const { enterDetail } = useApp();
  // localhost reads the shared live SSE frame so its CPU/MEM/TEMP readouts show
  // real values (and its sparkline gets a hover tooltip); every other rack keeps
  // its static "—" text and non-interactive trend string. `card` is null until
  // the first live frame lands, so we fall back to the selector's "—" until then.
  const { card, hist } = useSystemMetrics();
  const isLocal = isLiveHost(server.id);
  const live = isLocal ? card : null;
  const liveCpu = isLocal && hist.cpu.length ? hist.cpu : null;

  // localhost: prefer the live frame (a real 0% shows as "0%", never "—"); else
  // the selector's "—". Non-local racks always use the selector text.
  const cpuText = live ? `${live.cpu}%` : server.cpuText;
  const ramText = live ? `${live.ram}%` : server.ramText;
  const tempText = live ? `${live.temp}°` : server.tempText;

  // Build points + coords from the SAME buffer/geometry so the hover dot lands
  // on the drawn line. Fall back to the static selector string when offline.
  const sparkPts = liveCpu ? spark(liveCpu, 100, 22, 2) : server.spark;
  const sparkPtsCoords = useMemo(
    () => (liveCpu ? sparkCoords(liveCpu, 100, 22, 2) : undefined),
    [liveCpu],
  );

  return (
    <div
      onClick={() => enterDetail(server.id)}
      data-rk-hover="row"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        border: `1px solid ${colors.borderCard}`,
        background: colors.cardGradientRow,
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'border-color .15s,transform .15s',
      }}
    >
      <div
        style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: server.statusColor }}
      />
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: server.statusColor,
          boxShadow: `0 0 9px ${server.statusColor}`,
          flexShrink: 0,
        }}
      />
      <div style={{ width: 170, flexShrink: 0 }}>
        <div
          className="cond"
          style={{ fontSize: 18, fontWeight: 700, color: colors.textHi, letterSpacing: '.04em', lineHeight: 1 }}
        >
          {server.code}
        </div>
        <div className="mono" style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>
          {server.vessel} · {server.pennant}
        </div>
      </div>
      <div className="mono" style={{ fontSize: 11, color: colors.textMid2, flex: 1, minWidth: 90 }}>
        {server.role}
      </div>
      <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
        <Metric label="CPU" value={cpuText} color={colors.textBody} />
        <Metric label="MEM" value={ramText} color={colors.textBody} />
        <Metric label="TEMP" value={tempText} color={colors.textBody} />
      </div>
      <div style={{ flexShrink: 0 }}>
        <Sparkline
          points={sparkPts}
          stroke={colors.accent}
          strokeWidth={1.4}
          opacity={1}
          width={110}
          height={30}
          values={liveCpu ?? undefined}
          coords={sparkPtsCoords}
          format={(v) => `${Math.round(v)}% CPU`}
        />
      </div>
    </div>
  );
}
