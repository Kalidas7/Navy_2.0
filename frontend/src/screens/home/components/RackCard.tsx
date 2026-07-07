/**
 * Grid-layout rack card — thin orchestrator. Split into a memoized static shell
 * (RackCardStatic: header, status pill, role) that is SKIPPED every simulation
 * tick, and independent live leaves (MetricValue ×3, Sparkline) that re-render
 * each tick like a Task Manager readout. Only the live nodes touch the DOM per
 * tick; the static subtree is bailed out of by React.memo.
 *
 * Per the handoff: CPU/MEM/TEMP are all neutral (primary text) here, and the
 * left accent bar is transparent for nominal racks (server.barColor already
 * encodes that).
 */
import { useCallback, useMemo } from 'react';
import { useApp } from '@/app/AppContext';
import { useSystemMetrics } from '@/app/SystemMetricsContext';
import { Card } from '@/components/common/Card';
import { MetricValue } from '@/components/common/MetricValue';
import { Sparkline } from '@/components/common/Sparkline';
import { sparkCoords } from '@/lib/sparkline';
import { colors } from '@/config/tokens';
import { isLiveHost } from '@/data/fleet';
import type { FleetServerVM } from '@/app/selectors';
import { RackCardStatic } from './RackCardStatic';

export function RackCard({ server }: { server: FleetServerVM }) {
  const { enterDetail } = useApp();
  // The localhost rack reads its CPU/MEM/TEMP/spark from the SHARED live SSE
  // stream (same source of truth as the detail view), so the card and the
  // detail page never diverge. `live` is null until the first frame lands, in
  // which case we fall back to the hydrated fleet values.
  const { card, hist } = useSystemMetrics();
  const isLocal = isLiveHost(server.id);
  const live = isLocal ? card : null;

  // localhost: prefer the live SSE frame, else its hydrated value. Every other
  // rack shows "—" (no live sensor feed) via the selector's pre-formatted text.
  const cpu = live ? `${live.cpu}%` : server.cpuText;
  const ram = live ? `${live.ram}%` : server.ramText;
  const temp = live ? `${live.temp}°` : server.tempText;
  const sparkPts = live ? live.spark : server.spark;
  // Raw CPU buffer for the sparkline's hover (localhost only). Coords MUST use
  // the same geometry the card's spark string was built with (100×30, pad 2 —
  // see useSystemMetricsSource) so the crosshair dot lands on the drawn line.
  const sparkCpu = isLocal ? hist.cpu : null;
  const sparkPtsCoords = useMemo(
    () => (sparkCpu ? sparkCoords(sparkCpu, 100, 30, 2) : undefined),
    [sparkCpu],
  );

  // Stable handler so re-creating it each tick doesn't matter and callers stay tidy.
  const onOpen = useCallback(() => enterDetail(server.id), [enterDetail, server.id]);

  return (
    <Card accentColor={server.barColor} onClick={onOpen} padding={15}>
      {/* ── static: skipped every tick via React.memo ── */}
      <RackCardStatic
        code={server.code}
        vessel={server.vessel}
        pennant={server.pennant}
        role={server.role}
        statusColor={server.statusColor}
        statusLabel={server.statusLabel}
        statusBd={server.statusBd}
        statusBg={server.statusBg}
      />

      {/* ── live: re-render each tick, in isolation ── */}
      <div style={{ display: 'flex', gap: 7, marginBottom: 12 }}>
        <MetricValue label="CPU" value={cpu} />
        <MetricValue label="MEM" value={ram} />
        <MetricValue label="TEMP" value={temp} />
      </div>

      <div style={{ marginBottom: 11 }}>
        <Sparkline
          points={sparkPts}
          stroke={colors.accent}
          strokeWidth={1.4}
          opacity={1}
          height={30}
          viewHeight={30}
          values={sparkCpu ?? undefined}
          coords={sparkPtsCoords}
          format={(v) => `${Math.round(v)}% CPU`}
        />
      </div>

      {/* footer: single cheap text node, kept inline to preserve visual order */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 10,
          borderTop: `1px solid ${colors.borderCard}`,
        }}
      >
        <span className="mono" style={{ fontSize: 9.5, color: colors.textMuted }}>
          UP {server.uptime}
        </span>
      </div>
    </Card>
  );
}
