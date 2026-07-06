/**
 * TopBar — the single, shared header used by BOTH the Home (fleet) screen and
 * the server-detail screen, so the two never drift apart.
 *
 * Layout (left → right): "Console" heading · search box · status-filter dropdown
 * (home only) · spacer · alerts icon · clock. The search reuses the shared
 * query state (state.query / setQuery). On the detail screen, typing also
 * navigates back to the fleet so the filtered list is visible.
 *
 * The detail screen renders the active rack's name in a floating card BELOW this
 * bar (see ServerNameCard), not inside the bar itself.
 */
import { useApp } from '@/app/AppContext';
import type { FilterChipVM } from '@/app/selectors';
import { colors } from '@/config/tokens';
import type { FilterStatus } from '@/app/store';
import { NotificationsMenu } from './NotificationsMenu';

export interface TopBarProps {
  variant: 'home' | 'detail';
  /** Status-filter chips — required for the home variant, ignored on detail. */
  chips?: FilterChipVM[];
}

export function TopBar({ variant, chips = [] }: TopBarProps) {
  const { state, setQuery, setFilter, backHome } = useApp();
  const isDetail = variant === 'detail';

  // On the detail screen, searching returns to the fleet and filters it there;
  // on home it just updates the shared query in place.
  const onSearch = (q: string) => {
    setQuery(q);
    if (isDetail) backHome();
  };

  return (
    <div
      style={{
        position: isDetail ? 'absolute' : 'sticky',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        height: 56,
        padding: '0 20px',
        background: colors.panelBg,
        borderBottom: `1px solid ${colors.borderChrome}`,
        pointerEvents: 'auto',
      }}
    >
      {/* "Console" heading — far left on both screens. Click returns to the
          fleet from the detail screen (a no-op on home). */}
      <button
        type="button"
        onClick={backHome}
        title={isDetail ? 'Back to fleet' : undefined}
        data-rk-hover={isDetail ? 'accent' : undefined}
        className="mlabel"
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 36,
          background: 'transparent',
          border: 'none',
          padding: 0,
          fontSize: 16,
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: '.02em',
          // Consistent near-black heading on BOTH screens. On detail it's still a
          // "back to fleet" button (cursor + hover accent signal that), just not
          // tinted blue at rest.
          color: colors.textHi,
          cursor: isDetail ? 'pointer' : 'default',
          flex: 'none',
        }}
      >
        Console
      </button>

      {/* Search — fixed 36px height, matching the "Console" heading so the two
          line up cleanly. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flex: 1,
          minWidth: 200,
          maxWidth: 360,
          height: 36,
          padding: '0 12px',
          borderRadius: 8,
          border: `1px solid ${colors.borderInput}`,
          background: colors.baseBg,
        }}
      >
        <span style={{ color: colors.textMuted2, fontSize: 13, lineHeight: 1 }}>⌕</span>
        <input
          data-search-input
          value={state.query}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search rack · vessel · role…"
          aria-label="Search fleet"
          style={{
            flex: 1,
            minWidth: 0,
            height: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: colors.textBody,
            fontSize: 13,
          }}
        />
      </div>

      {/* Status filter dropdown — HOME only (hidden on the detail screen). */}
      {!isDetail && (
        <select
          value={state.filterStatus}
          onChange={(e) => setFilter(e.target.value as FilterStatus)}
          aria-label="Filter by status"
          style={{
            height: 36,
            padding: '0 10px',
            borderRadius: 8,
            border: `1px solid ${colors.borderInput}`,
            background: colors.panelBg,
            color: colors.textBody,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          {chips.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label} · {c.count}
            </option>
          ))}
        </select>
      )}

      {/* Spacer pushes the alerts icon + clock to the far right. */}
      <div style={{ flex: 1 }} />

      {/* Alerts notification icon + dropdown. Icon takes the clock colour; click
          opens a menu of warn/crit notifications (home = "All" list; detail =
          Current/All tabs). See NotificationsMenu. */}
      <NotificationsMenu variant={variant} />

      {/* Clock — far right */}
      <div className="mono" style={{ fontSize: 12, color: colors.textMid2, letterSpacing: '.08em' }}>
        {state.clock}
      </div>
    </div>
  );
}
