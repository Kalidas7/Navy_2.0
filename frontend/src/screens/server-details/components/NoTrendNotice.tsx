/**
 * Shown when a subsystem has no plottable stored metric (e.g. Status) and the
 * user picks a non-Live range. Shared by the desktop rail and the mobile sheet.
 */
import { colors } from '@/config/tokens';

export function NoTrendNotice() {
  return (
    <div
      style={{
        height: '100%',
        minHeight: 160,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        textAlign: 'center',
        color: colors.textMuted,
      }}
    >
      <span style={{ fontSize: 24, color: colors.textMuted2 }}>◷</span>
      <div
        className="mlabel"
        style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', color: colors.textMid }}
      >
        NO TREND FOR THIS VIEW
      </div>
      <div style={{ fontSize: 11.5, maxWidth: 240, lineHeight: 1.4 }}>
        This panel shows a live snapshot with no single metric to chart. Switch back to{' '}
        <strong>Live</strong> for current readings.
      </div>
    </div>
  );
}
