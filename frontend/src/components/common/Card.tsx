/**
 * Generic bordered surface card: gradient background, optional left accent bar,
 * optional click + CSS hover. Memoized so a stable subtree is skipped on parent
 * re-renders — but note the accent/click chrome is cheap, so the real re-render
 * win for data-driven cards comes from keeping the *static content* behind its
 * own memo boundary (see RackCardStatic) rather than passing it as `children`.
 */
import { memo, type ReactNode } from 'react';
import { colors } from '@/config/tokens';

interface CardProps {
  children: ReactNode;
  /** left accent bar colour; omit => no bar rendered */
  accentColor?: string;
  onClick?: () => void;
  /** value for the data-rk-hover attribute driving CSS hover (default 'card') */
  hoverAttr?: string;
  padding?: number | string;
  background?: string;
  borderColor?: string;
  accentWidth?: number;
}

export const Card = memo(function Card({
  children,
  accentColor,
  onClick,
  hoverAttr = 'card',
  padding = 15,
  background = colors.cardGradient,
  borderColor = colors.borderCard,
  accentWidth = 3,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      data-rk-hover={hoverAttr}
      style={{
        position: 'relative',
        border: `1px solid ${borderColor}`,
        background,
        padding,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform .15s,border-color .15s,box-shadow .15s',
        overflow: 'hidden',
      }}
    >
      {accentColor != null && (
        <div
          style={{ position: 'absolute', top: 0, left: 0, width: accentWidth, height: '100%', background: accentColor }}
        />
      )}
      {children}
    </div>
  );
});
