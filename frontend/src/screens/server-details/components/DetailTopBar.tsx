/** Detail top bar: rack identity, back-to-fleet anchor, alerts, clock. */
import { useApp } from '@/app/AppContext';
import { selectActiveServer, selectAlertCount } from '@/app/selectors';
import { colors, STATUS_META } from '@/config/tokens';

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
        background: colors.panelBg,
        borderBottom: `1px solid ${colors.borderChrome}`,
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
        <div className="mlabel" style={{ fontSize: 15, fontWeight: 700, letterSpacing: '.01em', color: colors.textHi }}>
          {srv.code}
        </div>
        <div className="mlabel" style={{ fontSize: 11.5, color: colors.textMuted }}>
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
          borderRadius: 8,
          border: `1px solid ${STATUS_META.warn.bd}`,
          background: STATUS_META.warn.bg,
        }}
      >
        <span style={{ color: colors.amber, fontSize: 12 }}>⚠</span>
        <span className="mono" style={{ fontSize: 11, color: colors.alertText, letterSpacing: '.08em' }}>
          {alertCount} ALERTS
        </span>
      </div>

      <div className="mono" style={{ fontSize: 12, color: colors.textMid2, letterSpacing: '.08em' }}>
        {state.clock}
      </div>
    </div>
  );
}
