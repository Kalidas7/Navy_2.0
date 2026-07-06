/**
 * A single mono micro-label over a condensed value — the CPU/MEM/TEMP triad on
 * the rack card. Deliberately NOT memoized: it is a "live" leaf that is expected
 * to re-render every simulation tick (like a Task Manager readout), while the
 * static card chrome around it stays skipped. See RackCardStatic / RackCard.
 */
import type { ReactNode } from 'react';
import { colors } from '@/config/tokens';

interface MetricValueProps {
  label: string;
  /** the live value — e.g. `${cpu}%`, `${temp}°` */
  value: ReactNode;
  color?: string;
  valueSize?: number;
  labelColor?: string;
  labelSize?: number;
  flex?: number | string;
}

export function MetricValue({
  label,
  value,
  color = colors.textBody,
  valueSize = 16,
  labelColor = colors.textMuted2,
  labelSize = 8.5,
  flex = 1,
}: MetricValueProps) {
  return (
    <div style={{ flex }}>
      <div className="mlabel" style={{ fontSize: labelSize, color: labelColor, letterSpacing: '.1em', fontWeight: 700, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div className="cond" style={{ fontSize: valueSize, fontWeight: 700, color }}>
        {value}
      </div>
    </div>
  );
}
