/** Status Array panel: subsystem health list — real (localhost) or "—".
 *  The CPU row is a drop-down: click to expand a per-core utilisation list
 *  (one bar per logical core); click again to collapse. */
import { useState } from 'react';
import { useApp } from '@/app/AppContext';
import { useSystemMetrics } from '@/app/SystemMetricsContext';
import { useComponents } from '@/hooks/useComponents';
import { NoData } from '@/components/common/NoData';
import { colors } from '@/config/tokens';
import { isLiveHost } from '@/data/fleet';

/** A subsystem row is expandable when we have live per-core detail (CPU only). */
function isExpandable(name: string): boolean {
  return name.trim().toUpperCase() === 'CPU';
}

/** Per-core bar colour — mirrors CpuGraph bands (≤70 safe, ≤90 warn, else high). */
function coreColor(pct: number): string {
  if (pct > 90) return colors.red;
  if (pct > 70) return colors.amber;
  return colors.accent;
}

/** Expanded CPU detail: one labelled bar per logical core (live host only). */
function PerCoreBars({ perCore }: { perCore: number[] }) {
  if (perCore.length === 0) return <NoData label="NO CORE DATA" />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {perCore.map((pct, i) => {
        const p = Math.max(0, Math.min(100, pct));
        const col = coreColor(p);
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span className="mono" style={{ fontSize: 10, color: '#9aa3af', width: 46 }}>
              Core {i}
            </span>
            <div style={{ flex: 1, height: 7, borderRadius: 3, overflow: 'hidden', background: '#e2e5ea' }}>
              <div style={{ height: '100%', width: `${p}%`, background: col, transition: 'width .3s' }} />
            </div>
            <span className="mono" style={{ fontSize: 10, color: col, width: 34, textAlign: 'right' }}>
              {Math.round(p)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function StatusPanel() {
  const { state } = useApp();
  const items = useComponents().statusItems;
  const isLocal = isLiveHost(state.activeServerId);
  const offline = !isLocal;
  const live = useSystemMetrics();
  const [openRow, setOpenRow] = useState<string | null>(null);

  return (
    <>
      <div className="mlabel" style={{ fontSize: 9.5, color: colors.textMuted, letterSpacing: '.12em', marginBottom: 9 }}>
        SUBSYSTEM HEALTH
      </div>
      {items.length === 0 && <NoData label={offline ? 'NO LIVE FEED' : 'NO DATA'} />}
      {items.map((s) => {
        const expandable = !offline && isExpandable(s.name);
        const open = openRow === s.name;
        return (
          <div key={s.name} style={{ marginBottom: 6 }}>
            <div
              onClick={expandable ? () => setOpenRow(open ? null : s.name) : undefined}
              data-rk-hover={expandable ? 'accent' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                padding: '9px 11px',
                borderRadius: 8,
                border: `1px solid ${open ? colors.accent : colors.borderInner}`,
                background: colors.iconTileGradient,
                cursor: expandable ? 'pointer' : 'default',
              }}
            >
              <span className="mlabel" style={{ fontSize: 13, fontWeight: 600, color: colors.textBody, flex: 1 }}>
                {s.name}
              </span>
              <span className="mono" style={{ fontSize: 10.5, color: s.color, letterSpacing: '.06em' }}>
                {s.state}
              </span>
              {expandable && (
                <span
                  className="mono"
                  style={{
                    fontSize: 10,
                    color: colors.textMuted,
                    transform: open ? 'rotate(180deg)' : 'none',
                    transition: 'transform .2s',
                  }}
                >
                  ▾
                </span>
              )}
            </div>

            {expandable && open && (
              <div
                style={{
                  border: `1px solid ${colors.accent}`,
                  borderTop: 'none',
                  borderRadius: '0 0 8px 8px',
                  background: colors.iconTileGradient,
                  padding: '10px 11px',
                }}
              >
                <PerCoreBars perCore={live.raw?.cpu.perCore ?? []} />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
