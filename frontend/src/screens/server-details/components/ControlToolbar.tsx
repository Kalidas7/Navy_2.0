/** Left vertical toolbar: auto-rotate, explode, and the six subsystem quick-buttons. */
import { useApp } from '@/app/AppContext';
import { selectCompButtons } from '../compView';
import { toggleStyles, colors } from '@/config/tokens';

export function ControlToolbar({ hideSubsystems = false }: { hideSubsystems?: boolean }) {
  const { state, compStates, toggleAutoRotate, toggleExplode, selectComp } = useApp();
  // In the datacenter two-rack stage the six subsystem buttons are hidden until
  // a rack is clicked; the rotate/explode controls stay available.
  const buttons = hideSubsystems ? [] : selectCompButtons(compStates, state.selectedComp);
  // toggleStyles returns a transparent bg when inactive, which lets the 3D model
  // show through. These float over the model, so force the same opaque dark the
  // quick-buttons use when off; keep the accent tint when active.
  const rot = toggleStyles(state.autoRotate);
  const exp = toggleStyles(state.exploded);
  const inactiveBg = 'transparent';

  const sq = (bg: string, bd: string, fg: string, fontSize: number): React.CSSProperties => ({
    width: 40,
    height: 40,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 8,
    background: bg,
    border: `1px solid ${bd}`,
    color: fg,
    cursor: 'pointer',
    fontSize,
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: 14,
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 8,
        borderRadius: 12,
        background: colors.panelBg,
        border: `1px solid ${colors.borderCard}`,
        boxShadow: '0 4px 16px rgba(16,24,40,.08)',
        pointerEvents: 'auto',
        zIndex: 4,
      }}
    >
      <button
        type="button"
        title="Auto-rotate"
        onClick={toggleAutoRotate}
        data-rk-hover="accent"
        style={sq(state.autoRotate ? rot.bg : inactiveBg, rot.bd, rot.fg, 17)}
      >
        ⟳
      </button>
      <button
        type="button"
        title="Exploded view"
        onClick={toggleExplode}
        data-rk-hover="accent"
        style={sq(state.exploded ? exp.bg : inactiveBg, exp.bd, exp.fg, 16)}
      >
        ⛶
      </button>

      {buttons.length > 0 && (
        <div style={{ height: 1, background: colors.borderCard, margin: '2px 0' }} />
      )}

      {buttons.map((b) => (
        <button
          key={b.key}
          type="button"
          title={b.label}
          onClick={() => selectComp(b.key)}
          data-rk-hover="accent"
          style={{
            ...sq(
              b.selected ? 'rgba(37,99,235,.10)' : 'transparent',
              b.selected ? colors.accent : 'transparent',
              b.color,
              16,
            ),
            position: 'relative',
          }}
        >
          {b.glyph}
        </button>
      ))}
    </div>
  );
}
