/** Display-panel RADAR tab: circular sweep scope + sonar contacts list. */
import { colors } from '@/config/tokens';
import type { SonarContact } from '@/types';

export function RadarView({ contacts }: { contacts: SonarContact[] }) {
  return (
    <div style={{ display: 'flex', gap: 13, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          position: 'relative',
          width: 210,
          height: 210,
          borderRadius: '50%',
          border: '1px solid #1c4a3a',
          background: 'radial-gradient(circle,#08231a 0%,#06140f 70%)',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', inset: 26, borderRadius: '50%', border: '1px solid #11402f' }} />
        <div style={{ position: 'absolute', inset: 62, borderRadius: '50%', border: '1px solid #0d3527' }} />
        <div style={{ position: 'absolute', inset: 96, borderRadius: '50%', border: '1px solid #0d3527' }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: '#0f3a2b' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: '#0f3a2b' }} />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'conic-gradient(from 0deg, rgba(43,240,160,.32), transparent 55%)',
            animation: 'rkspin 3.6s linear infinite',
          }}
        />
        {contacts.map((c) => (
          <div
            key={c.id}
            style={{
              position: 'absolute',
              left: `${c.x}%`,
              top: `${c.y}%`,
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: c.color,
              boxShadow: `0 0 9px ${c.color}`,
              transform: 'translate(-50%,-50%)',
              animation: `rkblink ${c.blink}s infinite`,
            }}
          />
        ))}
      </div>

      <div style={{ flex: 1, minWidth: 160 }}>
        <div className="mono" style={{ fontSize: 9.5, color: colors.textMuted, letterSpacing: '.12em', marginBottom: 7 }}>
          SONAR CONTACTS
        </div>
        {contacts.map((c) => (
          <div
            key={c.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: '6px 0',
              borderBottom: '1px solid #112027',
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.color }} />
            <span className="mono" style={{ fontSize: 11, color: colors.textBody, width: 42 }}>
              {c.id}
            </span>
            <span className="mono" style={{ fontSize: 10.5, color: '#7c9a90', flex: 1 }}>
              {c.type}
            </span>
            <span className="mono" style={{ fontSize: 10.5, color: '#7fb8a6' }}>
              {c.bearing}° · {c.range}km
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
