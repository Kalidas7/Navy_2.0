/**
 * Empty-state placeholder for subsystem lists. Rendered when a panel has no
 * real devices to show (e.g. a simulated rack with no live feed, or the brief
 * moment before the localhost rack's real component data arrives). Shows a
 * neutral "—" instead of fabricating fake rows.
 */
import { colors } from '@/config/tokens';

export function NoData({ label = 'NO DATA' }: { label?: string }) {
  return (
    <div
      className="mono"
      style={{
        padding: '14px 12px',
        border: `1px dashed ${colors.borderInner}`,
        background: colors.panelBg,
        color: colors.textMuted,
        fontSize: 11,
        letterSpacing: '.1em',
        textAlign: 'center',
      }}
    >
      — {label} —
    </div>
  );
}
