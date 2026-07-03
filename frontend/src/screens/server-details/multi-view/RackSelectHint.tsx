/**
 * Stage-1 hint for the datacenter two-rack view: prompt the user to click a
 * server. Specific to the two-stage datacenter flow, so it lives under
 * multi-view/.
 */
import { colors } from '@/config/tokens';

export function RackSelectHint() {
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 80,
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 16px',
        border: `1px solid ${colors.borderInput}`,
        background: 'rgba(8,14,18,.82)',
        backdropFilter: 'blur(4px)',
        zIndex: 5,
        animation: 'rkfade .4s ease',
      }}
    >
      <span style={{ color: colors.accent, fontSize: 15, animation: 'rkblink 2s infinite' }}>◉</span>
      <span className="mono" style={{ fontSize: 12, color: '#8fb3a6', letterSpacing: '.08em' }}>
        CLICK A SERVER TO INSPECT
      </span>
    </div>
  );
}
