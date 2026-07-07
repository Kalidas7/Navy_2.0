/**
 * Time-range selector shown in each panel header (replaces the old NOMINAL
 * status text). Defaults to "Live"; clicking opens a dropdown of preset ranges
 * (1D / 7D / 1M) plus a "Custom…" option that reveals an inline calendar for
 * picking a start→end date range.
 *
 * NOTE: the app currently persists no metric history (only a ~48s live buffer),
 * so any range other than Live has no real data to show yet. This component only
 * owns the SELECTION; the panels render an honest "No history yet — collecting"
 * state for non-Live ranges (see RailPanel). No fabricated data.
 */
import { useEffect, useRef, useState } from 'react';
import { colors } from '@/config/tokens';

export type RangeKey = 'live' | '1d' | '7d' | '1m' | 'custom';

export interface TimeRange {
  key: RangeKey;
  /** custom range endpoints (ms epoch), only set when key === 'custom' */
  from?: number;
  to?: number;
}

const PRESETS: { key: RangeKey; label: string }[] = [
  { key: 'live', label: 'Live' },
  { key: '1d', label: '1D' },
  { key: '7d', label: '7D' },
  { key: '1m', label: '1M' },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DOW = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

/** Label shown on the trigger button for the current selection. */
function rangeLabel(r: TimeRange): string {
  if (r.key === 'custom' && r.from && r.to) {
    const f = new Date(r.from);
    const t = new Date(r.to);
    const d = (x: Date) => `${x.getDate()} ${MONTHS[x.getMonth()].slice(0, 3).toUpperCase()}`;
    return `${d(f)} – ${d(t)}`;
  }
  return PRESETS.find((p) => p.key === r.key)?.label ?? 'Live';
}

export function TimeRangeMenu({
  value,
  onChange,
}: {
  value: TimeRange;
  onChange: (r: TimeRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showCal, setShowCal] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Esc.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCal(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setShowCal(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (key: RangeKey) => {
    if (key === 'custom') {
      setShowCal(true);
      return;
    }
    onChange({ key });
    setOpen(false);
    setShowCal(false);
  };

  const applyCustom = (from: number, to: number) => {
    onChange({ key: 'custom', from, to });
    setOpen(false);
    setShowCal(false);
  };

  const itemStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    padding: '7px 11px',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '.04em',
    textAlign: 'left',
    background: active ? 'rgba(37,99,235,.10)' : 'transparent',
    color: active ? colors.accent : colors.textMid,
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  });

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() =>
          setOpen((o) => {
            const next = !o;
            // Open fresh: only auto-expand the calendar if a custom range is
            // actually committed. Closing always collapses the calendar so a
            // never-applied "Custom range…" click doesn't stick.
            setShowCal(next ? value.key === 'custom' : false);
            return next;
          })
        }
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '2px 7px',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '.1em',
          background: open ? 'rgba(37,99,235,.10)' : 'transparent',
          color: open ? colors.accent : colors.textMid2,
          border: `1px solid ${open ? colors.accent : colors.borderInput}`,
          borderRadius: 6,
          cursor: 'pointer',
          textTransform: 'uppercase',
        }}
      >
        {rangeLabel(value)}
        <span style={{ fontSize: 8 }}>▾</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 26,
            left: 0,
            zIndex: 40,
            minWidth: 150,
            padding: 5,
            background: colors.panelBg,
            border: `1px solid ${colors.borderInput}`,
            borderRadius: 10,
            boxShadow: '0 8px 28px rgba(16,24,40,.16)',
          }}
        >
          {PRESETS.map((p) => (
            // While the custom calendar is open, no preset is highlighted — only
            // "Custom range…" reads as the pending choice, so Live and Custom
            // never both look selected at once.
            <button key={p.key} type="button" onClick={() => pick(p.key)} style={itemStyle(!showCal && value.key === p.key)}>
              {p.label}
            </button>
          ))}
          <div style={{ height: 1, background: colors.borderInput, margin: '4px 2px' }} />
          <button type="button" onClick={() => pick('custom')} style={itemStyle(value.key === 'custom' || showCal)}>
            <span style={{ flex: 1 }}>Custom range…</span>
            {(value.key === 'custom' || showCal) && <span style={{ color: colors.accent }}>✓</span>}
          </button>

          {showCal && <Calendar initialFrom={value.from} initialTo={value.to} onApply={applyCustom} />}
        </div>
      )}
    </div>
  );
}

/* ---------- inline calendar (start→end range picker) ---------- */

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function Calendar({
  initialFrom,
  initialTo,
  onApply,
}: {
  initialFrom?: number;
  initialTo?: number;
  onApply: (from: number, to: number) => void;
}) {
  const today = new Date();
  const [view, setView] = useState(() => {
    const base = initialFrom ? new Date(initialFrom) : today;
    return { y: base.getFullYear(), m: base.getMonth() };
  });
  const [from, setFrom] = useState<number | null>(initialFrom ?? null);
  const [to, setTo] = useState<number | null>(initialTo ?? null);

  const firstDay = new Date(view.y, view.m, 1);
  // JS getDay(): 0=Sun..6=Sat. Our grid starts Monday, so shift.
  const leadBlanks = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();

  const clickDay = (day: number) => {
    const t = startOfDay(new Date(view.y, view.m, day));
    // First click (or restarting after a full range) sets the start; second sets the end.
    if (from == null || to != null) {
      setFrom(t);
      setTo(null);
    } else if (t < from) {
      setTo(from);
      setFrom(t);
    } else {
      setTo(t);
    }
  };

  const shiftMonth = (delta: number) => {
    setView((v) => {
      const m = v.m + delta;
      return { y: v.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 };
    });
  };

  const inRange = (t: number) => from != null && to != null && t >= from && t <= to;
  const isEnd = (t: number) => t === from || t === to;

  const navBtn: React.CSSProperties = {
    width: 26,
    height: 26,
    display: 'grid',
    placeItems: 'center',
    background: colors.baseBg,
    border: `1px solid ${colors.borderInput}`,
    borderRadius: 6,
    color: colors.textMid,
    cursor: 'pointer',
    fontSize: 12,
  };

  const summary =
    from != null && to != null
      ? (() => {
          const f = new Date(from);
          const t = new Date(to);
          const days = Math.round((to - from) / 86400000) + 1;
          const d = (x: Date) => `${x.getDate()} ${MONTHS[x.getMonth()].slice(0, 3).toUpperCase()}`;
          return `${d(f)} – ${d(t)} · ${days} day${days === 1 ? '' : 's'}`;
        })()
      : from != null
        ? 'Pick an end date'
        : 'Pick a start date';

  return (
    <div style={{ marginTop: 6, padding: 10, borderTop: `1px solid ${colors.borderInput}`, width: 258 }}>
      {/* month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <button type="button" onClick={() => shiftMonth(-1)} style={navBtn} aria-label="Previous month">‹</button>
        <div className="mlabel" style={{ fontSize: 13, fontWeight: 700, color: colors.textHi }}>
          {MONTHS[view.m]} {view.y}
        </div>
        <button type="button" onClick={() => shiftMonth(1)} style={navBtn} aria-label="Next month">›</button>
      </div>

      {/* day-of-week header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
        {DOW.map((d) => (
          <div key={d} className="mlabel" style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: colors.textMuted2 }}>
            {d}
          </div>
        ))}
      </div>

      {/* day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {Array.from({ length: leadBlanks }).map((_, i) => (
          <div key={`b${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const t = startOfDay(new Date(view.y, view.m, day));
          const end = isEnd(t);
          const mid = inRange(t) && !end;
          return (
            <button
              key={day}
              type="button"
              onClick={() => clickDay(day)}
              style={{
                height: 30,
                display: 'grid',
                placeItems: 'center',
                fontSize: 12,
                fontWeight: end ? 700 : 500,
                background: end ? colors.accent : mid ? 'rgba(37,99,235,.12)' : 'transparent',
                color: end ? '#fff' : colors.textBody,
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* footer: summary + apply */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
        <div className="mono" style={{ flex: 1, fontSize: 10.5, color: colors.textMuted }}>
          {summary}
        </div>
        <button
          type="button"
          disabled={from == null || to == null}
          onClick={() => from != null && to != null && onApply(from, to)}
          style={{
            padding: '7px 14px',
            fontSize: 12,
            fontWeight: 600,
            background: from != null && to != null ? colors.accent : colors.borderInput,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: from != null && to != null ? 'pointer' : 'default',
          }}
        >
          Apply
        </button>
      </div>
    </div>
  );
}
