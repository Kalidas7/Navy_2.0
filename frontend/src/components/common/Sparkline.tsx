/** Lightweight inline-SVG sparkline used across cards, rows, and the dock. */
interface SparklineProps {
  points: string;
  stroke: string;
  strokeWidth?: number;
  opacity?: number;
  height?: number;
  width?: string | number;
  /** viewBox height — matches the source series' `h` argument to spark() */
  viewHeight?: number;
}

export function Sparkline({
  points,
  stroke,
  strokeWidth = 1,
  opacity = 0.85,
  height = 30,
  width = '100%',
  viewHeight = 22,
}: SparklineProps) {
  return (
    <svg
      viewBox={`0 0 100 ${viewHeight}`}
      preserveAspectRatio="none"
      style={{ width, height, display: 'block' }}
    >
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        opacity={opacity}
      />
    </svg>
  );
}
