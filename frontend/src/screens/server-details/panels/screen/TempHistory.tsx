/**
 * Temperature history graph shown below the display panel's SYSTEM view.
 *
 * The temp GAUGE above it shows the instantaneous reading; this shows the stored
 * CPU-temperature trend over days / a month, from the persisted history feed. It
 * has its own compact 1D / 7D / 1M toggle, independent of the rail's range, so
 * the display panel can show a long temp trend while the live gauge keeps
 * updating. No fabricated data — gaps render as line breaks.
 */
import { useState } from 'react';
import { useHistory } from '@/hooks/useHistory';
import { HistoryGraph } from '@/components/common/HistoryGraph';
import { colors } from '@/config/tokens';
import type { HistoryRange } from '@/api/history';

const RANGES: { key: Exclude<HistoryRange, 'custom'>; label: string }[] = [
  { key: '1d', label: '1D' },
  { key: '7d', label: '7D' },
  { key: '1m', label: '1M' },
];

export function TempHistory() {
  const [range, setRange] = useState<Exclude<HistoryRange, 'custom'>>('1d');
  const { loading, error, series } = useHistory(range);

  return (
    <div
      style={{
        border: `1px solid ${colors.borderInner}`,
        borderRadius: 8,
        background: colors.panelBg,
        padding: 11,
        marginTop: 11,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="mlabel" style={{ fontSize: 9.5, letterSpacing: '.12em', color: colors.textMuted }}>
          TEMP HISTORY <span style={{ color: colors.textMuted2 }}>· °C</span>
        </span>
        <div style={{ display: 'flex', gap: 3 }}>
          {RANGES.map((r) => {
            const active = r.key === range;
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => setRange(r.key)}
                style={{
                  padding: '2px 8px',
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: '.08em',
                  background: active ? 'rgba(37,99,235,.10)' : 'transparent',
                  color: active ? colors.accent : colors.textMuted2,
                  border: `1px solid ${active ? colors.accent : colors.borderInput}`,
                  borderRadius: 5,
                  cursor: 'pointer',
                }}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      <HistoryGraph
        series={series}
        metric="temp"
        color="#ef4444"
        unit="°"
        loading={loading}
        error={error}
        height={110}
      />
    </div>
  );
}
