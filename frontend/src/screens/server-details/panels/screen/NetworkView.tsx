/** Display-panel NETWORK tab: egress/ingress, dual-area throughput chart, footer stats. */
import { useMemo } from 'react';
import { StatCard } from '@/components/common/StatCard';
import {
  useGraphHover,
  HoverCrosshair,
  HoverTooltip,
  buildLiveSamples,
  type HoverSample,
} from '@/components/common/graphHover';
import { sparkCoords } from '@/lib/sparkline';
import { colors } from '@/config/tokens';
import type { GraphValues } from '@/types';

/** Raw ring-buffer histories the throughput chart's hover reads. */
interface LiveHist {
  cpu: number[];
  ram: number[];
  netIn: number[];
  netOut: number[];
}

export function NetworkView({ g, offline = false, hist }: { g: GraphValues; offline?: boolean; hist?: LiveHist }) {
  // Real host reports Mb/s; the sim used "Gb/s". Offline racks show "—".
  const unit = offline ? undefined : ' Mb/s';

  // Throughput hover: egress (out) + ingress (in). Coords use the SAME spark()
  // normalisation as the drawn lines (100×38, pad 3) so the dots align.
  const netSamples = useMemo<HoverSample[] | null>(() => {
    if (!hist) return null;
    return buildLiveSamples([
      { color: '#2563eb', label: '▲ EGRESS', values: hist.netOut, coords: sparkCoords(hist.netOut, 100, 38, 3), fmt: (v) => `${v.toFixed(1)} Mb/s` },
      { color: '#f59e0b', label: '▼ INGRESS', values: hist.netIn, coords: sparkCoords(hist.netIn, 100, 38, 3), fmt: (v) => `${v.toFixed(1)} Mb/s` },
    ]);
  }, [hist]);
  const netHover = useGraphHover(netSamples, 100);

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 13 }}>
        <StatCard
          label="▲ EGRESS"
          value={offline ? '—' : g.netOutNow}
          color={colors.accent}
          valueSize={26}
          unit={unit}
          unitColor="#9aa3af"
        />
        <StatCard
          label="▼ INGRESS"
          value={offline ? '—' : g.netInNow}
          color="#f59e0b"
          valueSize={26}
          unit={unit}
          unitColor="#9aa3af"
        />
      </div>

      <div style={{ border: `1px solid ${colors.borderInner}`, borderRadius: 8, background: colors.panelBg, padding: 11, marginBottom: 11 }}>
        <div className="mlabel" style={{ fontSize: 9.5, color: colors.textMuted, letterSpacing: '.12em', marginBottom: 6 }}>
          THROUGHPUT
        </div>
        <div style={{ position: 'relative', cursor: hist ? 'crosshair' : 'default' }} onMouseMove={netHover.onMove} onMouseLeave={netHover.onLeave}>
          <svg viewBox="0 0 100 38" preserveAspectRatio="none" style={{ width: '100%', height: 108, display: 'block' }}>
            <defs>
              {/* ingress = orange (secondary), egress = blue accent (primary) */}
              <linearGradient id="rkneti" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#f59e0b" stopOpacity="0.18" />
                <stop offset="1" stopColor="#f59e0b" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="rkneto" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#2563eb" stopOpacity="0.18" />
                <stop offset="1" stopColor="#2563eb" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={g.netInArea} fill="url(#rkneti)" />
            <polygon points={g.netOutArea} fill="url(#rkneto)" />
            <polyline points={g.netInPts} fill="none" stroke="#f59e0b" strokeWidth={0.9} />
            <polyline points={g.netOutPts} fill="none" stroke="#2563eb" strokeWidth={0.9} />
            <HoverCrosshair hover={netHover} viewH={38} />
          </svg>
          <HoverTooltip hover={netHover} />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          border: `1px solid ${colors.borderInner}`,
          borderRadius: 8,
          background: colors.panelBg,
          padding: '10px 12px',
        }}
      >
        <FooterStat label="PACKETS/s" value={offline ? '—' : `${g.pktNow}`} color={colors.textBody} />
        <FooterStat label="LOAD AVG" value={offline ? '—' : `${g.latNow}`} color={colors.accent} />
        <FooterStat label="PROCS" value={offline ? '—' : `${g.sessNow}`} color={colors.textBody} />
      </div>
    </>
  );
}

function FooterStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 9.5, color: colors.textMuted }}>
        {label}
      </div>
      <div className="cond" style={{ fontSize: 18, color }}>
        {value}
      </div>
    </div>
  );
}
