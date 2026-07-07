/**
 * Close (✕) control for the datacenter (localhost-2) single-rack stage. Floats
 * at the TOP-LEFT of the 3D view. Acts as a single "one step back" control:
 * while a component is focused (zoomed in), the first click DESELECTS it and
 * returns to the single-server view where the component was picked; a second
 * click (no component focused) expands back to the two-rack Stage 1. Without
 * this, closing from a zoomed component jumped straight past the single-rack
 * view back to both racks. Lives under multi-view/ because it is specific to
 * the two-stage datacenter flow (no other rack renders it).
 */
import { useApp } from '@/app/AppContext';
import { colors } from '@/config/tokens';

export function ExpandRacksButton() {
  const { state, closeMenu, expandRacks } = useApp();
  const hasSelection = !!state.selectedComp;
  // Step back one level: focused component → single-server view first, then
  // single rack → both racks.
  const onClick = hasSelection ? closeMenu : expandRacks;
  const label = hasSelection ? 'Back to server view' : 'Back to both servers';

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
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
        background: colors.panelBg,
        borderRadius: 8,
        border: `1px solid ${colors.borderInput}`,
        boxShadow: '0 4px 16px rgba(16,24,40,.08)',
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
