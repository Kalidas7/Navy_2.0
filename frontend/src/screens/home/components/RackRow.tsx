/**
 * Roster-layout rack row. Per the prototype, this view keeps the original
 * treatment: CPU green, MEM blue, accent bar always coloured by status.
 */
import { useApp } from '@/app/AppContext';
import { Sparkline } from '@/components/common/Sparkline';
import { colors } from '@/config/tokens';
import type { FleetServerVM } from '@/app/selectors';

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div className="mono" style={{ fontSize: 8.5, color: colors.textMuted2 }}>
        {label}
      </div>
      <div className="cond" style={{ fontSize: 16, color }}>
        {value}
      </div>
    </div>
  );
}

export function RackRow({ server }: { server: FleetServerVM }) {
  const { enterDetail } = useApp();

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
      <div className="mono" style={{ fontSize: 11, color: '#7c9a90', flex: 1, minWidth: 90 }}>
        {server.role}
      </div>
      <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
        <Metric label="CPU" value={server.cpuText} color={colors.accent} />
        <Metric label="MEM" value={server.ramText} color={colors.blue} />
        <Metric label="TEMP" value={server.tempText} color={colors.textBody} />
      </div>
      <div style={{ flexShrink: 0 }}>
        <Sparkline points={server.spark} stroke={server.statusColor} strokeWidth={1.2} width={110} height={30} />
      </div>
      <span
        className="cond"
        style={{ fontSize: 13, color: colors.accent, letterSpacing: '.08em', flexShrink: 0 }}
      >
        OPEN ▸
      </span>
    </div>
  );
}
