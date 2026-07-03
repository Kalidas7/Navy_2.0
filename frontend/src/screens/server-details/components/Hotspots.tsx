/**
 * HTML hotspot markers projected onto the 3D model. Positions come from the
 * scene controller (via useScene); styling/click handling stay in React.
 *
 * Each marker: a 30×30 circular glyph button + a label chip. Coloured by the
 * subsystem's health; selected scales up with a stronger glow; criticals pulse
 * red, warnings pulse amber; markers fade out when behind the camera.
 */
import { useApp } from '@/app/AppContext';
import { COMPS } from '@/config/components';
import { compColor, colors } from '@/config/tokens';
import type { MarkerPosition } from '@/three/SceneController';
import type { CompKey } from '@/types';

const COMP_BY_KEY = new Map(COMPS.map((c) => [c.key, c]));

export function Hotspots({ markers }: { markers: MarkerPosition[] }) {
  const { state, compStates, theme, selectComp } = useApp();
  const showLabels = theme.hotspotLabels;
  const sel = state.selectedComp;

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
      {markers.map((m) => {
        const def = COMP_BY_KEY.get(m.key);
        if (!def) return null;
        const st = compStates[m.key as CompKey] ?? 'ok';
        const col = compColor(st);
        const active = sel === m.key;
        const animation =
          st === 'crit' ? 'rkpulse 1.4s infinite' : st === 'warn' ? 'rkpulseW 1.8s infinite' : 'none';

        return (
          <div
            key={m.key}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              pointerEvents: 'none',
              transition: 'opacity .2s',
              willChange: 'transform',
              transform: `translate(${m.x.toFixed(1)}px,${m.y.toFixed(1)}px) translate(-15px,-15px)`,
              opacity: m.visible ? 1 : 0,
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                selectComp(m.key as CompKey);
              }}
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                pointerEvents: m.visible ? 'auto' : 'none',
                fontSize: 15,
                background: 'rgba(7,12,15,.82)',
                backdropFilter: 'blur(2px)',
                transition: 'transform .15s',
                border: `1.6px solid ${col}`,
                color: col,
                boxShadow: active
                  ? `0 0 16px ${col}`
                  : `0 0 8px ${st === 'ok' ? 'rgba(43,240,160,.25)' : col}`,
                transform: active ? 'scale(1.18)' : 'scale(1)',
                animation,
              }}
            >
              {def.glyph}
            </button>
            {showLabels && (
              <div
                className="cond"
                style={{
                  padding: '3px 9px',
                  background: 'rgba(7,12,15,.82)',
                  border: `1px solid ${active ? col : colors.borderInput}`,
                  fontFamily: 'Saira Condensed,sans-serif',
                  fontSize: 11.5,
                  letterSpacing: '.1em',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  color: active ? col : colors.textMid,
                }}
              >
                {def.label}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
