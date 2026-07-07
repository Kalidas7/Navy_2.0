/** Display-panel SYSTEM tab: CPU/MEM cards, dual-line utilisation chart, temp gauge + disk donut.
 *  The CPU LOAD card is a drop-down (localhost only): click to expand an inline
 *  CPU-load graph with the safe/warn/high bands; click again to collapse. */
import { useMemo, useState } from 'react';
import { StatCard } from '@/components/common/StatCard';
import { TempGauge } from '@/components/common/TempGauge';
import { DonutGauge } from '@/components/common/DonutGauge';
import { CpuGraph } from '@/components/common/CpuGraph';
import { TempHistory } from './TempHistory';
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

/** Raw ring-buffer histories the live graphs' hover tooltips read. */
interface LiveHist {
  cpu: number[];
  ram: number[];
  netIn: number[];
  netOut: number[];
}

export function SystemView({
  g,
  offline = false,
  cpuHist = [],
  hist,
}: {
  g: GraphValues;
  offline?: boolean;
  /** raw CPU-% history (0–100) for the expandable CPU-load graph (localhost). */
  cpuHist?: number[];
  /** raw ring buffers for the utilisation chart's hover (localhost only). */
  hist?: LiveHist;
}) {
  // Non-localhost racks have no live feed: show "—" and drop the unit suffix.
  const dash = offline ? '—' : undefined;
  // CPU LOAD is expandable only when there's a live feed to graph.
  const expandable = !offline;
  const [cpuOpen, setCpuOpen] = useState(false);

  // Utilisation chart hover: CPU + MEM at each sample. Coords use the SAME
  // spark() normalisation as the drawn lines (100×38, pad 3) so dots align.
  const utilSamples = useMemo<HoverSample[] | null>(() => {
    if (!hist) return null;
    return buildLiveSamples([
      { color: colors.accent, label: 'CPU', values: hist.cpu, coords: sparkCoords(hist.cpu, 100, 38, 3), fmt: (v) => `${Math.round(v)}%` },
      { color: '#f59e0b', label: 'MEM', values: hist.ram, coords: sparkCoords(hist.ram, 100, 38, 3), fmt: (v) => `${Math.round(v)}%` },
    ]);
  }, [hist]);
  const utilHover = useGraphHover(utilSamples, 100);

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 13 }}>
        {/* CPU LOAD — click to expand the banded CPU-load graph below. */}
        <div
          onClick={expandable ? () => setCpuOpen((o) => !o) : undefined}
          data-rk-hover={expandable ? 'accent' : undefined}
          style={{ cursor: expandable ? 'pointer' : 'default', position: 'relative' }}
        >
          <StatCard
            label="CPU LOAD"
            value={dash ?? g.cpuNow}
            color={colors.accent}
            valueSize={30}
            unit={offline ? undefined : '%'}
            unitColor="#9aa3af"
            unitSize={14}
          />
          {expandable && (
            <span
              className="mono"
              style={{
                position: 'absolute',
                top: 10,
                right: 11,
                fontSize: 10,
                color: colors.textMuted,
                transform: cpuOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform .2s',
              }}
            >
              ▾
            </span>
          )}
        </div>
        <StatCard
          label="MEMORY"
          value={dash ?? g.ramNow}
          color="#f59e0b"
          valueSize={30}
          unit={offline ? undefined : '%'}
          unitColor="#9aa3af"
          unitSize={14}
        />
      </div>

      {expandable && cpuOpen && (
        <div style={{ border: `1px solid ${colors.accent}`, background: colors.panelBg, padding: 11, marginBottom: 13 }}>
          <CpuGraph hist={cpuHist} now={g.cpuNow} />
        </div>
      )}

      <div style={{ border: `1px solid ${colors.borderInner}`, borderRadius: 8, background: colors.panelBg, padding: 11, marginBottom: 11 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span className="mlabel" style={{ fontSize: 9.5, color: colors.textMuted, letterSpacing: '.12em' }}>
            UTILISATION · 48s
          </span>
          <span className="mono" style={{ fontSize: 9.5, color: '#9aa3af' }}>
            <span style={{ color: colors.accent }}>CPU</span> ▬ <span style={{ color: '#f59e0b' }}>MEM</span>
          </span>
        </div>
        <div style={{ position: 'relative', cursor: hist ? 'crosshair' : 'default' }} onMouseMove={utilHover.onMove} onMouseLeave={utilHover.onLeave}>
          <svg viewBox="0 0 100 38" preserveAspectRatio="none" style={{ width: '100%', height: 104, display: 'block' }}>
            <line x1="0" y1="19" x2="100" y2="19" stroke="#e2e5ea" />
            <line x1="0" y1="28.5" x2="100" y2="28.5" stroke="#e2e5ea" />
            <polyline points={g.ramPts} fill="none" stroke="#f59e0b" strokeWidth={0.9} strokeLinejoin="round" />
            <polyline points={g.cpuPts} fill="none" stroke={colors.accent} strokeWidth={1.1} strokeLinejoin="round" />
            <HoverCrosshair hover={utilHover} viewH={38} />
          </svg>
          <HoverTooltip hover={utilHover} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, alignItems: 'stretch' }}>
        <div style={{ border: `1px solid ${colors.borderInner}`, borderRadius: 8, background: colors.panelBg, padding: '10px 11px' }}>
          <TempGauge value={g.tempNow} offline={offline} />
        </div>
        <div style={{ border: `1px solid ${colors.borderInner}`, borderRadius: 8, background: colors.panelBg, padding: '10px 11px' }}>
          <div className="mlabel" style={{ fontSize: 8.5, letterSpacing: '.14em', color: colors.textMuted, textAlign: 'center' }}>
            DISK USAGE
          </div>
          <DonutGauge pct={offline ? 0 : g.diskNow} offline={offline} color={colors.blue} caption="USED" />
        </div>
      </div>

      {/* Stored temperature trend over days / a month. Localhost-only (offline
          racks have no persisted history). The gauge above stays live. */}
      {!offline && <TempHistory />}
    </>
  );
}
