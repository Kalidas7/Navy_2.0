/** Centered hint pill shown when no subsystem is selected. */
import { colors } from '@/config/tokens';

export function SelectHint() {
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 80,
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 18px',
        borderRadius: 999,
        border: `1px solid ${colors.borderInput}`,
        background: colors.panelBg,
        boxShadow: '0 4px 14px rgba(16,24,40,.08)',
        zIndex: 5,
        animation: 'rkfade .4s ease',
      }}
    >
      <span style={{ color: colors.accent, fontSize: 15, animation: 'rkblink 2s infinite' }}>◉</span>
      <span className="mono" style={{ fontSize: 12, color: colors.textMid2, letterSpacing: '.08em' }}>
        SELECT A NODE ON THE RACK — OR USE THE TOOLBAR
      </span>
    </div>
  );
}
