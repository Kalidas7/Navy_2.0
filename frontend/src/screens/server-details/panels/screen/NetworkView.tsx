/** Display-panel NETWORK tab: egress/ingress, dual-area throughput chart, footer stats. */
import { StatCard } from '@/components/common/StatCard';
import { colors } from '@/config/tokens';
import type { GraphValues } from '@/types';

export function NetworkView({ g, offline = false }: { g: GraphValues; offline?: boolean }) {
  // Real host reports Mb/s; the sim used "Gb/s". Offline racks show "—".
  const unit = offline ? undefined : ' Mb/s';
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
          color={colors.blue}
          valueSize={26}
          unit={unit}
          unitColor="#9aa3af"
        />
      </div>

      <div style={{ border: `1px solid ${colors.borderInner}`, borderRadius: 8, background: colors.panelBg, padding: 11, marginBottom: 11 }}>
        <div className="mlabel" style={{ fontSize: 9.5, color: colors.textMuted, letterSpacing: '.12em', marginBottom: 6 }}>
          THROUGHPUT
        </div>
        <svg viewBox="0 0 100 38" preserveAspectRatio="none" style={{ width: '100%', height: 108, display: 'block' }}>
          <defs>
            <linearGradient id="rkneti" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2563eb" stopOpacity="0.18" />
              <stop offset="1" stopColor="#2563eb" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="rkneto" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0891b2" stopOpacity="0.18" />
              <stop offset="1" stopColor="#0891b2" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={g.netInArea} fill="url(#rkneti)" />
          <polygon points={g.netOutArea} fill="url(#rkneto)" />
          <polyline points={g.netInPts} fill="none" stroke="#2563eb" strokeWidth={0.9} />
          <polyline points={g.netOutPts} fill="none" stroke="#0891b2" strokeWidth={0.9} />
        </svg>
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
