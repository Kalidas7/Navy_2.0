/** Non-interactive detail overlays: radial vignette + four corner brackets. */
import { colors } from '@/config/tokens';

const bracket = (corner: 'tl' | 'tr' | 'bl' | 'br'): React.CSSProperties => {
  const c = colors.bracketGreen;
  const base: React.CSSProperties = { position: 'absolute', width: 34, height: 34, zIndex: 2 };
  switch (corner) {
    case 'tl':
      return { ...base, top: 64, left: 18, borderLeft: `2px solid ${c}`, borderTop: `2px solid ${c}` };
    case 'tr':
      return { ...base, top: 64, right: 18, borderRight: `2px solid ${c}`, borderTop: `2px solid ${c}` };
    case 'bl':
      return { ...base, bottom: 84, left: 18, borderLeft: `2px solid ${c}`, borderBottom: `2px solid ${c}` };
    case 'br':
      return { ...base, bottom: 84, right: 18, borderRight: `2px solid ${c}`, borderBottom: `2px solid ${c}` };
  }
};

export function AmbientOverlays() {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(130% 120% at 50% 40%, transparent 55%, rgba(2,5,8,.72) 100%)',
          zIndex: 1,
        }}
      />
      <div style={bracket('tl')} />
      <div style={bracket('tr')} />
      <div style={bracket('bl')} />
      <div style={bracket('br')} />
    </>
  );
}
