/** Detail top bar: rack identity, back-to-fleet anchor, alerts, clock. */
import { useApp } from '@/app/AppContext';
import { selectActiveServer, selectAlertCount } from '@/app/selectors';
import { colors } from '@/config/tokens';

export function DetailTopBar() {
  const { state, compStates, backHome } = useApp();
  const srv = selectActiveServer(state);
  const alertCount = selectAlertCount(compStates);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 52,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '0 16px',
        background: 'linear-gradient(180deg,rgba(6,11,14,.94),rgba(6,11,14,.55))',
        borderBottom: `1px solid ${colors.borderChrome}`,
        backdropFilter: 'blur(6px)',
        pointerEvents: 'auto',
        zIndex: 4,
      }}
    >
      {/* Back to fleet — absolutely centered so it stays dead-center regardless
          of the identity/alerts widths on either side. */}
      <button
        type="button"
        title="Back to fleet"
        aria-label="Back to fleet"
        onClick={backHome}
        data-rk-hover="accent"
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%,-50%)',
          width: 36,
          height: 36,
          display: 'grid',
          placeItems: 'center',
          background: 'transparent',
          border: 'none',
          padding: 0,
          color: colors.accent,
          cursor: 'pointer',
          fontSize: 18,
          lineHeight: 1,
        }}
      >
        ⚓
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
        <div className="cond" style={{ fontSize: 19, fontWeight: 700, letterSpacing: '.06em', color: colors.textHi }}>
          {srv.code}
        </div>
        <div className="mono" style={{ fontSize: 10.5, color: colors.textMuted, letterSpacing: '.08em' }}>
          {srv.vessel} · {srv.pennant} · {srv.role}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '5px 11px',
          border: '1px solid #2a1a1a',
          background: 'rgba(40,12,12,.4)',
        }}
      >
        <span style={{ color: '#ff8a4d', fontSize: 12 }}>⚠</span>
        <span className="mono" style={{ fontSize: 11, color: colors.alertText, letterSpacing: '.08em' }}>
          {alertCount} ALERTS
        </span>
      </div>

      <div className="mono" style={{ fontSize: 12, color: '#7fb8a6', letterSpacing: '.1em' }}>
        {state.clock}
      </div>
    </div>
  );
}
