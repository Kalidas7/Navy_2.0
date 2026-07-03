/** Format a HH:MM:SS clock string, optionally offset N seconds into the past. */
export function fmtClock(offsetSeconds = 0): string {
  const d = new Date(Date.now() - offsetSeconds * 1000);
  return (
    String(d.getHours()).padStart(2, '0') +
    ':' +
    String(d.getMinutes()).padStart(2, '0') +
    ':' +
    String(d.getSeconds()).padStart(2, '0')
  );
}
