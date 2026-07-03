/** Status pill: a glowing dot + label, coloured by status meta. */
import type { StatusMeta } from '@/config/tokens';

interface StatusPillProps {
  meta: StatusMeta;
  /** dot size in px */
  dot?: number;
  glow?: boolean;
  fontSize?: number;
  padding?: string;
  gap?: number;
  letterSpacing?: string;
}

export function StatusPill({
  meta,
  dot = 7,
  glow = true,
  fontSize = 11,
  padding = '5px 11px',
  gap = 8,
  letterSpacing = '.1em',
}: StatusPillProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap,
        padding,
        border: `1px solid ${meta.bd}`,
        background: meta.bg,
      }}
    >
      <span
        style={{
          width: dot,
          height: dot,
          borderRadius: '50%',
          background: meta.color,
          boxShadow: glow ? `0 0 ${dot}px ${meta.color}` : 'none',
        }}
      />
      <span
        className="mono"
        style={{ fontSize, letterSpacing, color: meta.color }}
      >
        {meta.label}
      </span>
    </div>
  );
}
