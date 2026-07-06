/** Home header: anchor tile, title + flag chip, live clock, grid/list toggle. */
import { useApp } from '@/app/AppContext';
import { colors } from '@/config/tokens';

export function FleetHeader() {
  const { state, setHomeStyle } = useApp();
  const accent = colors.accent;

  const toggleBtn = (active: boolean): React.CSSProperties => ({
    width: 40,
    height: 34,
    display: 'grid',
    placeItems: 'center',
    background: active ? 'rgba(37,99,235,.10)' : 'transparent',
    color: active ? accent : colors.textMid,
    border: 'none',
    cursor: 'pointer',
    fontSize: 17,
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 16,
        paddingBottom: 18,
        borderBottom: `1px solid ${colors.borderChrome}`,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          display: 'grid',
          placeItems: 'center',
          border: `1px solid ${colors.borderIcon}`,
          background: colors.iconTileGradient,
        }}
      >
        <span style={{ fontSize: 24, color: accent }}>⚓</span>
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', height: 13, border: `1px solid ${colors.borderChrome}` }}>
            <span style={{ width: 16, background: colors.flagSaffron }} />
            <span style={{ width: 16, background: colors.flagWhite }} />
            <span style={{ width: 16, background: colors.flagGreen }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
        <div className="mono" style={{ fontSize: 13, color: colors.textMid2, letterSpacing: '.08em' }}>
          {state.clock} IST
        </div>
        <div style={{ display: 'flex', border: `1px solid ${colors.borderInput}` }}>
          <button
            type="button"
            title="Grid view"
            onClick={() => setHomeStyle('A')}
            style={toggleBtn(state.homeStyle === 'A')}
          >
            ▦
          </button>
          <button
            type="button"
            title="List view"
            onClick={() => setHomeStyle('B')}
            style={{
              ...toggleBtn(state.homeStyle === 'B'),
              borderLeft: `1px solid ${colors.borderInput}`,
            }}
          >
            ☰
          </button>
        </div>
      </div>
    </div>
  );
}
