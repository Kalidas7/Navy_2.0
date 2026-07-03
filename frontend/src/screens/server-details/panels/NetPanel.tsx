/** Network Ports panel: real network interfaces (localhost) with live up/down
 *  throughput and a visual connected/disconnected indicator. */
import { useApp } from '@/app/AppContext';
import { NoData } from '@/components/common/NoData';
import { colors } from '@/config/tokens';
import { isLiveHost } from '@/data/fleet';

/** A small connection indicator: filled/green when up, hollow/grey when down. */
function LinkIcon({ up }: { up: boolean }) {
  const col = up ? colors.accent : colors.textMuted2;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {/* three ascending signal bars */}
      <svg width={16} height={13} viewBox="0 0 16 13" style={{ display: 'block' }}>
        {[0, 1, 2].map((i) => (
          <rect
            key={i}
            x={i * 5.5}
            y={9 - i * 4}
            width={3.4}
            height={4 + i * 4}
            rx={0.6}
            fill={col}
            opacity={up ? 1 : 0.4}
          />
        ))}
      </svg>
      <span className="mono" style={{ fontSize: 9, letterSpacing: '.08em', color: col }}>
        {up ? 'CONNECTED' : 'OFFLINE'}
      </span>
    </div>
  );
}

export function NetPanel() {
  const { state } = useApp();
  const ports = state.comp.netPorts;
  const offline = !isLiveHost(state.activeServerId);

  return (
    <>
      <div className="mono" style={{ fontSize: 9.5, color: colors.textMuted, letterSpacing: '.12em', marginBottom: 9 }}>
        NETWORK INTERFACES
      </div>
      {ports.length === 0 && <NoData label={offline ? 'NO LIVE FEED' : 'NO INTERFACES'} />}
      {ports.map((p) => {
        const up = p.state === 'LINK UP';
        return (
          <div
            key={p.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              padding: '10px 11px',
              marginBottom: 7,
              border: `1px solid ${colors.borderInner}`,
              background: colors.panelBg,
              opacity: up ? 1 : 0.72,
            }}
          >
            {/* name + link status */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="mono" style={{ fontSize: 12, color: colors.textBody, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {p.id}
              </div>
              <div style={{ marginTop: 3 }}>
                <LinkIcon up={up} />
              </div>
            </div>

            {/* live up/down throughput */}
            <div style={{ textAlign: 'right' }}>
              <div className="mono" style={{ fontSize: 10.5, color: up ? colors.accent : colors.textMuted2 }}>
                ↑ {up ? p.out : '—'}
              </div>
              <div className="mono" style={{ fontSize: 10.5, color: up ? colors.blue : colors.textMuted2 }}>
                ↓ {up ? p.in : '—'}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
