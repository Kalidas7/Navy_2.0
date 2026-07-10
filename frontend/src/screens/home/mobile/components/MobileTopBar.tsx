/**
 * Mobile fleet header — brand, search toggle + row, status filter, alerts.
 *
 * Reads the SAME shared state the desktop TopBar does (`state.query`,
 * `state.filterStatus`), so a filter set here survives a rotate into the
 * desktop layout and vice versa. `NotificationsMenu` is reused verbatim rather
 * than reimplemented, which keeps the alerts list identical across tiers.
 *
 * The handoff's top bar has no alerts affordance; we add one because the
 * desktop bar has it, and dropping it on mobile would lose functionality.
 */
import { useApp } from '@/app/AppContext';
import type { FilterChipVM } from '@/app/selectors';
import type { FilterStatus } from '@/app/store';
import { NotificationsMenu } from '@/components/common/NotificationsMenu';
import { colors, statusMeta } from '@/config/tokens';
import styles from '../styles.module.css';

/** Filter-key → dot colour. 'all' has no status colour, so it takes the accent. */
function dotColor(key: FilterStatus): string {
  return key === 'all' ? colors.accent : statusMeta(key).color;
}

export interface MobileTopBarProps {
  chips: FilterChipVM[];
  searchOpen: boolean;
  onToggleSearch: () => void;
  filterOpen: boolean;
  onToggleFilter: () => void;
  onCloseFilter: () => void;
}

export function MobileTopBar({
  chips,
  searchOpen,
  onToggleSearch,
  filterOpen,
  onToggleFilter,
  onCloseFilter,
}: MobileTopBarProps) {
  const { state, setQuery, setFilter, backHome } = useApp();
  const active = state.filterStatus;

  return (
    <>
      <div className={styles.topbar}>
        <button type="button" className={styles.brand} onClick={backHome} aria-label="Console — fleet home">
          <span className={styles.brandTile} aria-hidden>▣</span>
          <span className={styles.brandWord}>Console</span>
        </button>

        <button
          type="button"
          className={styles.iconBtn}
          onClick={onToggleSearch}
          aria-label="Search servers"
          aria-expanded={searchOpen}
          style={
            searchOpen
              ? { background: 'rgba(37,99,235,.10)', color: colors.accent }
              : undefined
          }
        >
          ⌕
        </button>

        <div className={styles.filterWrap}>
          <button
            type="button"
            className={styles.filterBtn}
            onClick={onToggleFilter}
            aria-label="Filter by status"
            aria-expanded={filterOpen}
          >
            <span className={styles.dot} style={{ background: dotColor(active) }} />
            <span className={`${styles.caret} ${filterOpen ? styles.caretOpen : ''}`}>▾</span>
          </button>

          {filterOpen && (
            <div className={styles.menu} role="menu">
              {chips.map((c) => {
                const on = active === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    role="menuitemradio"
                    aria-checked={on}
                    className={styles.menuItem}
                    onClick={() => {
                      setFilter(c.key);
                      onCloseFilter();
                    }}
                    style={on ? { background: 'rgba(37,99,235,.10)', color: colors.accent } : undefined}
                  >
                    <span className={styles.dot} style={{ background: dotColor(c.key) }} />
                    <span className={styles.menuLabel}>{c.label}</span>
                    <span className={styles.menuCount}>{c.count}</span>
                    <span style={{ fontSize: 11, color: colors.accent, visibility: on ? 'visible' : 'hidden' }}>
                      ✓
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <NotificationsMenu variant="home" />
      </div>

      {filterOpen && <div className={styles.backdrop} onClick={onCloseFilter} />}

      {searchOpen && (
        <div className={styles.searchRow}>
          <div className={styles.searchField}>
            <span className={styles.searchGlyph} aria-hidden>⌕</span>
            {/* data-search-input keeps the `\` keyboard shortcut working here too. */}
            <input
              data-search-input
              className={styles.searchInput}
              value={state.query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search servers…"
              aria-label="Search fleet"
            />
            {state.query.length > 0 && (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={() => setQuery('')}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
