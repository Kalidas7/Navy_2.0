/**
 * ServerNameCard — floating identity label for the active rack, shown top-left
 * of the 3D area on the detail screen, just BELOW the shared TopBar and to the
 * RIGHT of the close (✕) button so the two don't overlap. Replaces the rack
 * identity that used to live inside the old detail top bar.
 */
import { useApp } from '@/app/AppContext';
import { selectActiveServer } from '@/app/selectors';
import { colors } from '@/config/tokens';

export function ServerNameCard() {
  const { state } = useApp();
  const srv = selectActiveServer(state);
  // The close (✕) button only exists in the collapsed single-rack stage. When
  // it's present, shift the card right of it (button left:16, width 38 → right
  // edge ≈ 54) so it never overlaps; otherwise sit flush at the left margin.
  const left = state.rackCollapsed ? 64 : 16;

  return (
    <div
      style={{
        // Aligned with the close button's top (62); left tracks whether that
        // button is on screen so the two never overlap.
        position: 'absolute',
        top: 62,
        left,
        zIndex: 4,
        display: 'flex',
        flexDirection: 'column',
        lineHeight: 1.05,
        padding: '8px 12px',
        borderRadius: 10,
        background: colors.panelBg,
        border: `1px solid ${colors.borderCard}`,
        boxShadow: '0 4px 16px rgba(16,24,40,.08)',
        pointerEvents: 'auto',
      }}
    >
      <div className="mlabel" style={{ fontSize: 15, fontWeight: 700, letterSpacing: '.01em', color: colors.textHi }}>
        {srv.code}
      </div>
      <div className="mlabel" style={{ fontSize: 11.5, color: colors.textMuted }}>
        {srv.vessel} · {srv.pennant} · {srv.role}
      </div>
    </div>
  );
}
