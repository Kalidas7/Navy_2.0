/**
 * DEMO banner — shown ONLY in web-demo mode (VITE_DATA_MODE=web).
 *
 * Enforces the data-honesty rule (CLAUDE.md): in web mode every reading is
 * SIMULATED, so a persistent, unmissable label tells the viewer the numbers are
 * a demonstration and not real sensor data. In 'live' mode this renders nothing.
 */
import { IS_WEB_DEMO } from '@/config/dataMode';
import { colors } from '@/config/tokens';

export function DemoBanner() {
  if (!IS_WEB_DEMO) return null;
  return (
    <div
      role="status"
      aria-label="Simulated demo data"
      style={{
        position: 'fixed',
        top: 8,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 12px',
        borderRadius: 999,
        fontFamily: fontMono,
        fontSize: 11,
        letterSpacing: '0.08em',
        fontWeight: 700,
        color: '#111',
        background: colors.amber,
        border: '1px solid rgba(0,0,0,0.25)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          background: '#111',
          animation: 'rkblink 1.2s infinite',
        }}
      />
      DEMO · SIMULATED DATA — NOT REAL READINGS
    </div>
  );
}

// Monospace stack matches the rest of the console chrome.
const fontMono =
  'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';
