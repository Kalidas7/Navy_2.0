/**
 * Non-Live view for the rail: real stored history for the SELECTED subsystem's
 * own metrics over the chosen time range (1D / 7D / 1M / Custom).
 *
 * Which graphs appear is driven by HISTORY_GRAPHS[comp] — so the Fan menu shows
 * fan/disk-I/O history, the Net menu shows throughput, etc. A menu with no
 * plottable series (status) renders nothing. The live scalar readouts are
 * unaffected; switching back to Live restores the per-subsystem live panel.
 */
import { useHistory } from '@/hooks/useHistory';
import { HistoryGraph } from '@/components/common/HistoryGraph';
import { colors } from '@/config/tokens';
import { HISTORY_GRAPHS } from './historyConfig';
import type { TimeRange } from './TimeRangeMenu';
import type { HistoryRange } from '@/api/history';
import type { CompKey } from '@/types';

/** Map the panel's RangeKey to the history API's range param (drops 'live'). */
function toHistoryRange(r: TimeRange): HistoryRange | null {
  if (r.key === 'live') return null;
  if (r.key === 'custom') return 'custom';
  return r.key; // '1d' | '7d' | '1m'
}

export function HistoryPanel({ comp, range }: { comp: CompKey; range: TimeRange }) {
  const specs = HISTORY_GRAPHS[comp];
  const hr = toHistoryRange(range);
  // Hooks must run unconditionally; when this menu has no graphs we still call
  // useHistory (with the range) but simply render nothing below.
  const { loading, error, series } = useHistory(specs.length ? hr : null, range.from, range.to);

  // Pages without a plottable series show no history section at all.
  if (specs.length === 0) return null;

  const rangeLabel = range.key === 'custom' ? 'selected range' : range.key.toUpperCase();

  // Is the stored power an estimate (RAPL unreadable) rather than measured? If
  // any point carries the flag, label the POWER graph "EST. POWER" so an
  // estimate is never shown as a measured reading.
  const powerEstimated = !!series?.points.some((p) => p.power_est);
  const titleFor = (s: (typeof specs)[number]) =>
    s.metric === 'power_w' && powerEstimated ? 'EST. POWER' : s.title;

  // Hide a graph entirely when its metric has NO data at all (e.g. GPU BUSY on a
  // host with no GPU sensor). We only hide once the series has loaded and the
  // metric is confirmed null in every point — during the initial load we keep
  // all cards so they don't flicker in and out. A metric with even one real
  // reading stays; partial gaps still render as honest breaks inside its graph.
  const loaded = !loading && series != null;
  const hasData = (metric: (typeof specs)[number]['metric']) =>
    !!series?.points.some((p) => p[metric] != null);
  const visibleSpecs = loaded ? specs.filter((s) => hasData(s.metric)) : specs;

  // Everything for this menu is unavailable on this host (all metrics all-null).
  if (loaded && visibleSpecs.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="mlabel" style={{ fontSize: 9.5, letterSpacing: '.12em', color: colors.textMuted }}>
          STORED HISTORY · {rangeLabel}
        </div>
        <div style={{ fontSize: 11.5, color: colors.textMuted2, lineHeight: 1.4, padding: '4px 2px' }}>
          {error
            ? 'History unavailable.'
            : 'These metrics aren’t recorded on this host, so there’s no trend to show.'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="mlabel" style={{ fontSize: 9.5, letterSpacing: '.12em', color: colors.textMuted }}>
        STORED HISTORY · {rangeLabel}
        {series && series.count > 0 && (
          <span style={{ color: colors.textMuted2 }}> · {series.count.toLocaleString()} samples</span>
        )}
      </div>

      {visibleSpecs.map((s) => (
        <HistoryCard key={s.metric} title={titleFor(s)} unit={s.unit.trim() || '—'}>
          <HistoryGraph
            series={series}
            metric={s.metric}
            color={s.color}
            unit={s.unit}
            loading={loading}
            error={error}
            yMin={s.yMin}
            yMax={s.yMax}
          />
        </HistoryCard>
      ))}
    </div>
  );
}

function HistoryCard({
  title,
  unit,
  children,
}: {
  title: string;
  unit: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: `1px solid ${colors.borderInner}`,
        borderRadius: 8,
        background: colors.panelBg,
        padding: 11,
      }}
    >
      <div
        className="mlabel"
        style={{ fontSize: 9.5, letterSpacing: '.12em', color: colors.textMuted, marginBottom: 8 }}
      >
        {title} <span style={{ color: colors.textMuted2 }}>· {unit}</span>
      </div>
      {children}
    </div>
  );
}
