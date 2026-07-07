/**
 * The "rail" — a docked side panel shown when a subsystem is selected.
 * Header (label + state + close) over a scrollable body that
 * routes to the selected subsystem's panel.
 */
import { useEffect, useState } from 'react';
import { useApp } from '@/app/AppContext';
import { selectActiveComp } from '../compView';
import { colors } from '@/config/tokens';
import { TimeRangeMenu, type TimeRange } from './TimeRangeMenu';
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
  // Per-panel time range; defaults to Live. Reset to Live whenever a different
  // subsystem is selected so a new panel always opens on the live feed.
  const [range, setRange] = useState<TimeRange>({ key: 'live' });
  useEffect(() => {
    setRange({ key: 'live' });
  }, [sel]);
  if (!sel) return null;

  const active = selectActiveComp(compStates, sel);
  const Panel = PANELS[sel];
  const isLive = range.key === 'live';

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
          <div style={{ lineHeight: 1.1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="mlabel" style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '.02em', color: colors.textHi }}>
              {active.label}
            </div>
            {/* Time-range selector — replaces the old NOMINAL status text. */}
            <TimeRangeMenu value={range} onChange={setRange} />
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

        {/* body — live panel, or an honest "no history yet" notice for any
            non-Live range (the app persists no metric history yet). */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
          {isLive ? (
            <Panel />
          ) : (
            <div
              style={{
                height: '100%',
                minHeight: 180,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                textAlign: 'center',
                color: colors.textMuted,
              }}
            >
              <span style={{ fontSize: 26, color: colors.textMuted2 }}>◷</span>
              <div className="mlabel" style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '.06em', color: colors.textMid }}>
                NO HISTORY YET
              </div>
              <div style={{ fontSize: 11.5, maxWidth: 240, lineHeight: 1.4 }}>
                Historical telemetry isn’t being stored yet — only the live feed is
                available. Switch back to <strong>Live</strong> to see current readings.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
