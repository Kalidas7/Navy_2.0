/**
 * The "rail" — a docked side panel shown when a subsystem is selected.
 * Header (glyph tile + label + state + close) over a scrollable body that
 * routes to the selected subsystem's panel.
 */
import { useApp } from '@/app/AppContext';
import { selectActiveComp } from '../compView';
import { colors } from '@/config/tokens';
import { ScreenPanel } from '../panels/ScreenPanel';
import { DrivesPanel } from '../panels/DrivesPanel';
import { FanPanel } from '../panels/FanPanel';
import { NetPanel } from '../panels/NetPanel';
import { PowerPanel } from '../panels/PowerPanel';
import { StatusPanel } from '../panels/StatusPanel';
import type { CompKey } from '@/types';

const PANELS: Record<CompKey, () => React.JSX.Element> = {
  screen: ScreenPanel,
  drives: DrivesPanel,
  fan: FanPanel,
  net: NetPanel,
  power: PowerPanel,
  status: StatusPanel,
};

export function RailPanel() {
  const { state, compStates, closeMenu } = useApp();
  const sel = state.selectedComp;
  if (!sel) return null;

  const active = selectActiveComp(compStates, sel);
  const Panel = PANELS[sel];

  return (
    <div
      style={{
        position: 'absolute',
        top: 60,
        right: 16,
        bottom: 72,
        width: 360,
        zIndex: 5,
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          background: colors.panelBg,
          borderRadius: 12,
          border: `1px solid ${colors.borderCard}`,
          boxShadow: '0 8px 28px rgba(16,24,40,.12)',
          overflow: 'hidden',
        }}
      >
        {/* header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            padding: '13px 14px',
            borderBottom: `1px solid ${colors.borderChrome}`,
            background: `linear-gradient(90deg,${active.tint},transparent)`,
          }}
        >
          <span
            style={{
              width: 34,
              height: 34,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 8,
              border: `1px solid ${active.color}`,
              color: active.color,
              fontSize: 17,
            }}
          >
            {active.glyph}
          </span>
          <div style={{ lineHeight: 1.1 }}>
            <div className="mlabel" style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '.02em', color: colors.textHi }}>
              {active.label}
            </div>
            <div className="mlabel" style={{ fontSize: 10, color: active.color, letterSpacing: '.12em' }}>
              {active.stateLabel}
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={closeMenu}
            data-rk-hover="close"
            style={{
              width: 28,
              height: 28,
              display: 'grid',
              placeItems: 'center',
              background: 'transparent',
              borderRadius: 6,
              border: `1px solid ${colors.borderInput}`,
              color: colors.textMid2,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            ✕
          </button>
        </div>

        {/* body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
          <Panel />
        </div>
      </div>
    </div>
  );
}
