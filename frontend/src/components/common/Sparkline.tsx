/** Lightweight inline-SVG sparkline used across cards, rows, and the dock.
 *
 *  Optionally interactive: pass `values` (the raw series behind `points`) and a
 *  `format` fn to enable the shared hover crosshair + tooltip (value + relative
 *  time). Without `values` it renders as a plain static sparkline — used for
 *  offline racks, which have no real series behind the line. */
import { useMemo } from 'react';
import {
  useGraphHover,
  HoverCrosshair,
  HoverTooltip,
  relTime,
  type HoverSample,
} from './graphHover';

interface SparklineProps {
  points: string;
  stroke: string;
  strokeWidth?: number;
  opacity?: number;
  height?: number;
  width?: string | number;
  /** viewBox height — matches the source series' `h` argument to spark() */
  viewHeight?: number;
  /** Raw values behind `points` (oldest→newest). Enables hover when provided. */
  values?: number[];
  /** {x,y} coords aligned 1:1 with `values` (from sparkCoords). Required with `values`. */
  coords?: { x: number; y: number }[];
  /** Formats a value for the tooltip, e.g. v => `${Math.round(v)}%`. */
  format?: (v: number) => string;
  /** Series color for the tooltip key (defaults to `stroke`). */
  hoverColor?: string;
}

export function Sparkline({
  points,
  stroke,
  strokeWidth = 1,
  opacity = 0.85,
  height = 30,
  width = '100%',
  viewHeight = 22,
  values,
  coords,
  format = (v) => `${Math.round(v)}`,
  hoverColor,
}: SparklineProps) {
  const samples = useMemo<HoverSample[] | null>(() => {
    if (!values || !coords || coords.length === 0) return null;
    const last = coords.length - 1;
    return coords.map((c, i) => ({
      x: c.x,
      caption: relTime(last - i, 1),
      series: [{ color: hoverColor ?? stroke, value: format(values[i]), y: c.y }],
    }));
  }, [values, coords, format, hoverColor, stroke]);
  const hover = useGraphHover(samples, 100);

  const svg = (
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
      {samples && <HoverCrosshair hover={hover} viewH={viewHeight} />}
    </svg>
  );

  // No raw data → plain static sparkline (no interaction wrapper).
  if (!samples) return svg;

  return (
    <div
      style={{ position: 'relative', width, cursor: 'crosshair' }}
      onMouseMove={hover.onMove}
      onMouseLeave={hover.onLeave}
    >
      {svg}
      <HoverTooltip hover={hover} />
    </div>
  );
}
