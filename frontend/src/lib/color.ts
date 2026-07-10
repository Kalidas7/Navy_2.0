/**
 * Colour helpers.
 *
 * The design tokens are opaque hex, but several surfaces in the mobile handoff
 * need the SAME hue at a different alpha (alert rings at 50%/7%, stat-cue fills
 * at 12%, selection overlays at 20%). Deriving them keeps one source of truth
 * per status colour instead of a second hard-coded rgba() table that can drift.
 */

/** `rgba(hex, a)` — accepts `#rgb` or `#rrggbb`. */
export function rgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
