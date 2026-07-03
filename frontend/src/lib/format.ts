/** Small shared value formatters for the readout panels. */

/**
 * Seconds → a compact battery-runtime label, e.g. "2h 14m left" / "45m left".
 * Used by the POWER views to annotate the battery gauge with time remaining.
 */
export function fmtSecsLeft(secs: number): string {
  const m = Math.floor(secs / 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h > 0 ? `${h}h ${mm}m left` : `${mm}m left`;
}
