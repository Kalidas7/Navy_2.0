/**
 * Bordered stat card: a mono micro-label over a big Saira Condensed value.
 * Used throughout the rail panels (CPU LOAD, MEMORY, DC BUS, etc.).
 */
import type { ReactNode } from 'react';
import { colors } from '@/config/tokens';

interface StatCardProps {
  label: string;
  /** big value — string or number */
  value: ReactNode;
  /** colour of the big value */
  color?: string;
  valueSize?: number;
  /** optional unit suffix rendered smaller next to the value */
  unit?: ReactNode;
  unitColor?: string;
  unitSize?: number;
  /** optional content below the value (e.g. a progress bar) */
  children?: ReactNode;
}

export function StatCard({
  label,
  value,
  color = colors.textBody,
  valueSize = 26,
  unit,
  unitColor = colors.textMuted,
  unitSize = 13,
  children,
}: StatCardProps) {
  return (
    <div style={{ border: `1px solid ${colors.borderInner}`, borderRadius: 8, background: colors.iconTileGradient, padding: '10px 11px' }}>
      <div className="mlabel" style={{ fontSize: 9.5, color: colors.textMuted2, letterSpacing: '.1em', fontWeight: 700, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div className="cond" style={{ fontSize: valueSize, fontWeight: 700, color, lineHeight: 1 }}>
        {value}
        {unit != null && <span style={{ fontSize: unitSize, color: unitColor }}>{unit}</span>}
      </div>
      {children}
    </div>
  );
}
