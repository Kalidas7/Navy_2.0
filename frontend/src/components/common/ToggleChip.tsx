/**
 * Toggle chip — the active/inactive button used by filter chips, screen tabs,
 * and the home grid/list toggle. Styling comes from `toggleStyles`.
 */
import type { ReactNode } from 'react';
import { toggleStyles } from '@/config/tokens';

interface ToggleChipProps {
  label: ReactNode;
  active: boolean;
  accent?: string;
  onClick: () => void;
  fontSize?: number;
  padding?: string;
  title?: string;
}

export function ToggleChip({
  label,
  active,
  accent,
  onClick,
  fontSize = 12.5,
  padding = '8px 14px',
  title,
}: ToggleChipProps) {
  const t = toggleStyles(active, accent);
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="cond"
      style={{
        padding,
        fontSize,
        letterSpacing: '.08em',
        cursor: 'pointer',
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.bd}`,
      }}
    >
      {label}
    </button>
  );
}
