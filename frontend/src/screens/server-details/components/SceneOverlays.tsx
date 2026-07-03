/** Loading ("ESTABLISHING UPLINK") and 3D-error fallback overlays. */
import { colors } from '@/config/tokens';

export function LoadingOverlay({ pct }: { pct: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 6,
        display: 'grid',
        placeItems: 'center',
        background: 'radial-gradient(circle at 50% 45%, #0b1822, #05080b)',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 54,
            height: 54,
            border: '2px solid #14322a',
            borderTopColor: colors.accent,
            borderRadius: '50%',
            animation: 'rkspin 1s linear infinite',
            margin: '0 auto 16px',
          }}
        />
        <div className="cond" style={{ fontSize: 16, letterSpacing: '.18em', color: colors.accent }}>
          ESTABLISHING UPLINK
        </div>
        <div className="mono" style={{ fontSize: 11, color: colors.textMuted, letterSpacing: '.1em', marginTop: 6 }}>
          loading rack geometry · {pct}%
        </div>
      </div>
    </div>
  );
}

export function ErrorOverlay({ message }: { message: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 6,
        display: 'grid',
        placeItems: 'center',
        background: '#05080b',
      }}
    >
      <div className="mono" style={{ color: colors.red, fontSize: 13, textAlign: 'center', maxWidth: 420, padding: 20 }}>
        3D ENGINE ERROR
        <br />
        <span style={{ color: '#7c9a90', fontSize: 11 }}>{message}</span>
      </div>
    </div>
  );
}
