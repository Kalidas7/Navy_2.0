/**
 * Build an SVG `<polyline>`/`<polygon>` points string from a numeric series.
 * Ported verbatim from the prototype's `spark()` so sparklines render
 * identically. Values are normalised to the series' own min/max.
 */
export function spark(arr: number[], w: number, h: number, pad = 0): string {
  return sparkCoords(arr, w, h, pad)
    .map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');
}

/**
 * The per-point {x, y} coordinates behind `spark()`, using the identical
 * normalisation (each series to its own min/max). Hover overlays read this so
 * their crosshair dots land exactly on the drawn polyline. Returns [] for an
 * empty series.
 */
export function sparkCoords(
  arr: number[],
  w: number,
  h: number,
  pad = 0,
): { x: number; y: number }[] {
  if (!arr || !arr.length) return [];
  let mn = Math.min(...arr);
  let mx = Math.max(...arr);
  if (mx - mn < 1e-3) mx = mn + 1;
  // Guard the single-point case: with one sample `i / (arr.length - 1)` is
  // `0 / 0 = NaN`, which produces an invalid "NaN,y" SVG point on the first
  // live frame. Spread points across [0, w]; a lone point sits at x = 0.
  const span = arr.length - 1 || 1;
  return arr.map((v, i) => ({
    x: (i / span) * w,
    y: h - pad - ((v - mn) / (mx - mn)) * (h - 2 * pad),
  }));
}
