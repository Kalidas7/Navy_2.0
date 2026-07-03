/** Thin progress / fill bar on a dark track. Square corners. */
interface ProgressBarProps {
  pct: number;
  /** fill colour or gradient */
  fill: string;
  height?: number;
  track?: string;
  marginTop?: number;
}

export function ProgressBar({
  pct,
  fill,
  height = 5,
  track = '#0f1d24',
  marginTop = 0,
}: ProgressBarProps) {
  return (
    <div style={{ height, background: track, marginTop }}>
      <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, pct))}%`, background: fill }} />
    </div>
  );
}
