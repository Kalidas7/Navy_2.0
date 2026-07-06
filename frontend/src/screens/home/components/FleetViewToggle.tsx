/**
 * "Servers" heading + grid/list view toggle for the Home screen. Lives BELOW
 * the top bar, in the content area: the heading fills the free space on the
 * left, the toggle sits on the right. Toggle drives state.homeStyle ('A' =
 * grid, 'B' = list) via setHomeStyle.
 */
import { useApp } from '@/app/AppContext';
import { colors } from '@/config/tokens';

export function FleetViewToggle() {
  const { state, setHomeStyle } = useApp();
  const accent = colors.accent;

  const btn = (active: boolean): React.CSSProperties => ({
    width: 38,
    height: 32,
    display: 'grid',
    placeItems: 'center',
    background: active ? 'rgba(37,99,235,.10)' : 'transparent',
    color: active ? accent : colors.textMid,
    border: 'none',
    cursor: 'pointer',
    fontSize: 16,
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
      {/* Heading fills the free space on the left of the toggle row. */}
      <div
        className="mlabel"
        style={{ fontSize: 20, fontWeight: 700, letterSpacing: '.01em', color: colors.textHi }}
      >
        Servers
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', border: `1px solid ${colors.borderInput}`, borderRadius: 8, overflow: 'hidden' }}>
        <button type="button" title="Grid view" onClick={() => setHomeStyle('A')} style={btn(state.homeStyle === 'A')}>
          ▦
        </button>
        <button
          type="button"
          title="List view"
          onClick={() => setHomeStyle('B')}
          style={{ ...btn(state.homeStyle === 'B'), borderLeft: `1px solid ${colors.borderInput}` }}
        >
          ☰
        </button>
      </div>
    </div>
  );
}
