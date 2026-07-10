/**
 * Mobile telemetry dock — PWR / FAN / NET ↑ plus the live-stream indicator.
 *
 * Reads the same `GraphValues` the desktop dock does. Data-honesty rules carried
 * over verbatim:
 *   - power  → "POWER" with measured watts when Intel RAPL is readable,
 *              otherwise the clearly-labelled "EST. POWER ~".
 *   - fan    → real RPM when spinning, "IDLE" when present but stopped (0),
 *              "—" when there is no fan sensor at all (-1).
 *   - before the first SSE frame every readout is "—", never a zero.
 *
 * Height is 56px, which `--rk-scene-bottom` depends on.
 */
import styles from '../styles.module.css';
import type { GraphValues } from '@/types';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.dockStat}>
      <span className={styles.dockLabel}>{label}</span>
      <span className={styles.dockValue}>{value}</span>
    </div>
  );
}

export interface MobileTelemetryDockProps {
  g: GraphValues;
  /** SSE/poll connection status. */
  status?: string;
  /** False until the first frame lands — everything reads "—" until then. */
  hasFrame: boolean;
}

export function MobileTelemetryDock({ g, status, hasFrame }: MobileTelemetryDockProps) {
  const connected = status === 'live' || status === 'polling';

  const power = !hasFrame ? '—' : g.powerReal ? `${g.drawNow} W` : `~${g.drawNow} W`;
  const fan = !hasFrame || g.fanTempNow < 0 ? '—' : g.fanTempNow === 0 ? 'IDLE' : `${g.fanTempNow} RPM`;
  const net = hasFrame ? `${g.netOutNow} Mb/s` : '—';

  return (
    <div className={styles.dock}>
      <Stat label={g.powerReal ? 'POWER' : 'EST. POWER'} value={power} />
      <span className={styles.dockRule} />
      <Stat label="FAN" value={fan} />
      <span className={styles.dockRule} />
      <Stat label="NET ↑" value={net} />

      <span className={styles.dockSpacer} />

      <div className={styles.dockLive}>
        <span
          className={styles.liveDot}
          style={{
            background: connected ? '#16a34a' : '#d97706',
            animation: connected ? 'rklivepulse 2s ease-out infinite' : undefined,
          }}
        />
        <span className={styles.liveText}>{(status ?? 'connecting').toUpperCase()}</span>
      </div>
    </div>
  );
}
