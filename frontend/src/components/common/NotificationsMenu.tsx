/**
 * Notifications dropdown — the ⚠ alerts icon in the TopBar opens a small menu
 * listing warn/crit notifications.
 *
 *  - Home variant:   a single "All" list, no tabs.
 *  - Detail variant: two tabs — "Current" (this server's subsystem alerts) and
 *                    "All" (fleet-wide). Defaults to "Current".
 *
 * Data comes from selectCurrentNotifs / selectAllNotifs (honest: only the active
 * server has per-subsystem detail; other racks surface their coarse status).
 * The icon glyph matches the app's line-icon style and takes the CLOCK colour.
 */
import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/app/AppContext';
import { useComponents } from '@/hooks/useComponents';
import { selectCurrentNotifs, selectAllNotifs, type NotifItem } from '@/app/selectors';
import { colors } from '@/config/tokens';

type Tab = 'current' | 'all';

export function NotificationsMenu({ variant }: { variant: 'home' | 'detail' }) {
  const { state } = useApp();
  const isDetail = variant === 'detail';
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('current'); // detail default = Current
  const wrapRef = useRef<HTMLDivElement>(null);

  // Live per-subsystem status for the active rack (SSE for the live host, else
  // the reducer's overlaid payload) — no longer routed through the shared
  // AppContext, so a fresh frame doesn't re-render every useApp() consumer.
  const statusItems = useComponents().statusItems;
  const current = selectCurrentNotifs(state, statusItems);
  const all = selectAllNotifs(state, statusItems);
  // Home always shows the fleet-wide list; detail switches by tab.
  const list = !isDetail ? all : tab === 'current' ? current : all;
  const count = all.length;

  // Close on outside click or Esc.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const tabBtn = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '7px 0',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '.04em',
    background: active ? 'rgba(37,99,235,.10)' : 'transparent',
    color: active ? colors.accent : colors.textMid,
    border: 'none',
    borderBottom: `2px solid ${active ? colors.accent : 'transparent'}`,
    cursor: 'pointer',
  });

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
      {/* Icon button — glyph takes the CLOCK colour (colors.textMid2). */}
      <button
        type="button"
        title={`${count} notifications`}
        aria-label={`${count} notifications`}
        onClick={() => {
          setOpen((o) => !o);
          if (isDetail) setTab('current');
        }}
        style={{
          position: 'relative',
          width: 28,
          height: 28,
          display: 'grid',
          placeItems: 'center',
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
        }}
      >
        {/* Clock-coloured at rest; accent blue while the dropdown is open. */}
        <span style={{ fontSize: 16, color: open ? colors.accent : colors.textMid2, transition: 'color .15s' }}>⚠</span>
        {count > 0 && (
          <span
            className="mono"
            style={{
              position: 'absolute',
              top: -3,
              right: -4,
              minWidth: 15,
              height: 15,
              padding: '0 3px',
              display: 'grid',
              placeItems: 'center',
              borderRadius: 8,
              background: colors.amber,
              color: '#fff',
              fontSize: 9,
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            {count}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 34,
            right: 0,
            width: 300,
            maxHeight: 360,
            display: 'flex',
            flexDirection: 'column',
            background: colors.panelBg,
            border: `1px solid ${colors.borderInput}`,
            borderRadius: 10,
            boxShadow: '0 8px 28px rgba(16,24,40,.14)',
            overflow: 'hidden',
            zIndex: 30,
          }}
        >
          <div
            className="mlabel"
            style={{
              padding: '10px 14px',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '.1em',
              color: colors.textMuted,
              borderBottom: `1px solid ${colors.borderInput}`,
            }}
          >
            NOTIFICATIONS
          </div>

          {/* Tabs — DETAIL only. */}
          {isDetail && (
            <div style={{ display: 'flex', borderBottom: `1px solid ${colors.borderInput}` }}>
              <button type="button" onClick={() => setTab('current')} style={tabBtn(tab === 'current')}>
                Current
              </button>
              <button type="button" onClick={() => setTab('all')} style={tabBtn(tab === 'all')}>
                All
              </button>
            </div>
          )}

          <div style={{ overflowY: 'auto' }}>
            {list.length === 0 ? (
              <div style={{ padding: '22px 14px', textAlign: 'center', fontSize: 12.5, color: colors.textMuted }}>
                No notifications
              </div>
            ) : (
              list.map((n) => <NotifRow key={n.id} n={n} />)
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotifRow({ n }: { n: NotifItem }) {
  // "SERVER · SUBSYSTEM" when a subsystem is known; just the server otherwise.
  const label = n.subsystem ? `${n.server} · ${n.subsystem}` : n.server;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderBottom: `1px solid ${colors.borderInput}`,
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: n.color, flex: 'none' }} />
      <span style={{ flex: 1, fontSize: 12.5, color: colors.textBody }}>{label}</span>
      <span className="mono" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', color: n.color }}>
        {n.state}
      </span>
    </div>
  );
}
