/**
 * Close (✕) control for the datacenter (localhost-2) single-rack stage. Floats
 * at the TOP-LEFT of the 3D view; returns from the single rack to the two-rack
 * Stage 1 view. Lives under multi-view/ because it is specific to the two-stage
 * datacenter flow (no other rack renders it).
 */
import { useApp } from '@/app/AppContext';
import { colors } from '@/config/tokens';

export function ExpandRacksButton() {
  const { expandRacks } = useApp();

  return (
    <button
      type="button"
      title="Back to both servers"
      aria-label="Back to both servers"
      onClick={expandRacks}
      data-rk-hover="accent"
      style={{
        // Top-left, just below the 52px top bar; clears the vertically-centered
        // control toolbar below it.
        position: 'absolute',
        left: 16,
        top: 62,
        width: 38,
        height: 38,
        display: 'grid',
        placeItems: 'center',
        background: 'rgba(10,18,22,.8)',
        border: `1px solid ${colors.borderInput}`,
        color: colors.accent,
        cursor: 'pointer',
        pointerEvents: 'auto',
        zIndex: 6,
        fontSize: 18,
        lineHeight: 1,
      }}
    >
      ✕
    </button>
  );
}
