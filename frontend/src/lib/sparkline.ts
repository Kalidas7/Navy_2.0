/**
 * Build an SVG `<polyline>`/`<polygon>` points string from a numeric series.
 * Ported verbatim from the prototype's `spark()` so sparklines render
 * identically. Values are normalised to the series' own min/max.
 */
export function spark(arr: number[], w: number, h: number, pad = 0): string {
  if (!arr || !arr.length) return '';
  let mn = Math.min(...arr);
  let mx = Math.max(...arr);
  if (mx - mn < 1e-3) mx = mn + 1;
  return arr
    .map((v, i) => {
      const x = (i / (arr.length - 1)) * w;
      const y = h - pad - ((v - mn) / (mx - mn)) * (h - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}
