/**
 * Mobile fleet card.
 *
 * Binds to exactly the same sources as the desktop `RackCard`: the shared SSE
 * stream for the live host (so card and detail view can never disagree) and the
 * selector's pre-formatted "—" for any rack without a sensor feed. Nothing is
 * derived, guessed, or simulated — a rack with no reading shows "—", and a
 * genuine 0% reading shows "0%", so "missing" and "zero" stay distinct.
 */
import { useCallback, useMemo } from 'react';
import { useApp } from '@/app/AppContext';
import { useSystemMetrics } from '@/app/SystemMetricsContext';
import { Sparkline } from '@/components/common/Sparkline';
import { colors } from '@/config/tokens';
import { isLiveHost } from '@/data/fleet';
import { rgba } from '@/lib/color';
import { sparkCoords } from '@/lib/sparkline';
import type { FleetServerVM } from '@/app/selectors';
import styles from '../styles.module.css';

/**
 * Value thresholds from the mobile handoff. Purely presentational: they colour a
 * real reading, they never invent one.
 */
const WARN = { metric: 70, temp: 75 };
const CRIT = { metric: 90, temp: 88 };

function valueColor(v: number | null, isTemp: boolean): string {
  if (v == null) return colors.textHi;
  const warn = isTemp ? WARN.temp : WARN.metric;
  const crit = isTemp ? CRIT.temp : CRIT.metric;
  if (v >= crit) return colors.red;
  if (v >= warn) return colors.amber;
  return colors.textHi;
}

export function ServerCardMobile({ server }: { server: FleetServerVM }) {
  const { enterDetail } = useApp();
  const { card, hist } = useSystemMetrics();

  const isLocal = isLiveHost(server.id);
  // `card` is null until the first SSE frame lands; fall back to the selector's "—".
  const live = isLocal ? card : null;
  const alerting = server.status === 'warn' || server.status === 'crit';

  // Standby racks report no metrics at all, per the handoff.
  const isStandby = server.status === 'standby';
  const cpu = live && !isStandby ? live.cpu : null;
  const ram = live && !isStandby ? live.ram : null;
  const temp = live && !isStandby ? live.temp : null;

  const sparkPts = live ? live.spark : server.spark;
  // Raw CPU buffer powers the hover tooltip (live host only). Geometry must match
  // the string in `live.spark` (100×30, pad 2) or the crosshair misses the line.
  const sparkCpu = isLocal ? hist.cpu : null;
  const sparkPtsCoords = useMemo(
    () => (sparkCpu ? sparkCoords(sparkCpu, 100, 30, 2) : undefined),
    [sparkCpu],
  );

  // online/standby draw the accent; warn/crit draw their own status colour.
  const sparkStroke = alerting ? server.statusColor : colors.accent;

  const onOpen = useCallback(() => enterDetail(server.id), [enterDetail, server.id]);
  const meta = `${server.vessel} · ${server.pennant} · ${server.role}`;

  return (
    <div
      className={styles.card}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      aria-label={`${server.code} — ${server.statusLabel}. Tap to inspect.`}
    >
      {alerting && (
        <span
          className={styles.cardRing}
          style={{
            border: `1px solid ${rgba(server.statusColor, 0.5)}`,
            boxShadow: `0 0 0 3px ${rgba(server.statusColor, 0.07)}`,
          }}
        />
      )}

      <div className={styles.cardTop}>
        <div className={styles.cardName}>{server.code}</div>
        <div
          className={styles.pill}
          style={{
            color: server.statusColor,
            background: server.statusBg,
            border: `1px solid ${server.statusBd}`,
          }}
        >
          <span
            className={styles.pillDot}
            style={{
              background: server.statusColor,
              // Reuses the existing `rkpulse` keyframe rather than adding a
              // near-identical `critpulse`.
              animation: server.status === 'crit' ? 'rkpulse 1.6s ease-out infinite' : undefined,
            }}
          />
          {server.statusLabel}
        </div>
      </div>

      <div className={styles.cardMeta}>{meta}</div>

      <div className={styles.metrics}>
        <div className={styles.metric}>
          <div className={styles.metricLabel}>CPU</div>
          <div className={styles.metricValue} style={{ color: valueColor(cpu, false) }}>
            {cpu == null ? server.cpuText : `${cpu}%`}
          </div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricLabel}>MEM</div>
          <div className={styles.metricValue} style={{ color: valueColor(ram, false) }}>
            {ram == null ? server.ramText : `${ram}%`}
          </div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricLabel}>TEMP</div>
          <div className={styles.metricValue} style={{ color: valueColor(temp, true) }}>
            {temp == null ? server.tempText : `${temp}°`}
          </div>
        </div>

        <div className={styles.sparkWrap}>
          <Sparkline
            points={sparkPts}
            stroke={sparkStroke}
            strokeWidth={1.6}
            opacity={1}
            height={30}
            viewHeight={30}
            values={sparkCpu ?? undefined}
            coords={sparkPtsCoords}
            format={(v) => `${Math.round(v)}% CPU`}
          />
        </div>
      </div>

      <div className={styles.footer}>
        <span>UP {server.uptime}</span>
        <span className={styles.footerHint}>Tap to inspect →</span>
      </div>
    </div>
  );
}
