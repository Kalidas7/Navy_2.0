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

  // When a component is selected, hide ALL hotspots so only that component's
  // panel is in focus. They reappear when the selection is closed.
  if (sel) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
      {markers.map((m) => {
        const def = COMP_BY_KEY.get(m.key);
        if (!def) return null;
        const st = compStates[m.key as CompKey] ?? 'ok';
        const col = compColor(st);
        // NB: no "selected" styling here — this whole component returns null when
        // a component is selected (see the early return above), so markers only
        // ever render in the unselected state.
        const animation =
          st === 'crit' ? 'rkpulse 1.4s infinite' : st === 'warn' ? 'rkpulseW 1.8s infinite' : 'none';
        // Left-side markers put the label to the LEFT of the dot (row-reverse)
        // and anchor from the right edge, so the dot sits left of the model and
        // the label extends outward — balancing the markers across both sides.
        const onLeft = def.side === 'left';

        return (
          <div
            key={m.key}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              display: 'flex',
              // Left-side markers: label first (to the LEFT of the dot).
              flexDirection: onLeft ? 'row-reverse' : 'row',
              alignItems: 'center',
              gap: 8,
              pointerEvents: 'none',
              transition: 'opacity .2s',
              willChange: 'transform',
              // Anchor at the projected point. Right markers grow rightward from
              // the dot (dot at the point). Left markers grow leftward: shift the
              // whole marker left by its own width (−100%) so the dot ends up just
              // left of the point and the label extends further left.
              transform: onLeft
                ? `translate(${m.x.toFixed(1)}px,${m.y.toFixed(1)}px) translate(-100%,-15px) translateX(15px)`
                : `translate(${m.x.toFixed(1)}px,${m.y.toFixed(1)}px) translate(-15px,-15px)`,
              // Behind-camera hides the marker; `reveal` (0→1) fades hotspots in
              // during the collapse fly-in so they appear as part of the motion.
              opacity: m.visible ? m.reveal : 0,
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
                pointerEvents: m.visible && m.reveal > 0.9 ? 'auto' : 'none',
                fontSize: 15,
                background: colors.panelBg,
                transition: 'transform .15s',
                border: `1.6px solid ${col}`,
                color: col,
                boxShadow: '0 2px 8px rgba(16,24,40,.12)',
                transform: 'scale(1)',
                animation,
              }}
            >
              {def.glyph}
            </button>
            {showLabels && (
              <div
                className="cond"
                onClick={(e) => {
                  e.stopPropagation();
                  selectComp(m.key as CompKey);
                }}
                style={{
                  padding: '5px 10px',
                  borderRadius: 6,
                  background: colors.panelBg,
                  border: `1px solid ${colors.borderInput}`,
                  boxShadow: '0 2px 8px rgba(16,24,40,.08)',
                  fontSize: 11.5,
                  letterSpacing: '.1em',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  pointerEvents: m.visible && m.reveal > 0.9 ? 'auto' : 'none',
                  color: colors.textMid,
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
