/**
 * Fleet (Home) — mobile.
 *
 * The mobile-format counterpart to `screens/home/index.tsx`. It renders the SAME
 * fleet from the SAME selectors and the SAME live SSE stream — only the layout
 * differs. There is no mobile-specific data path.
 *
 * Not ported from the design prototype: its fake iOS status bar (clock / "5G" /
 * battery glyph) and its six mock servers. The real phone draws its own status
 * bar, and the fleet comes from `/api/fleet`.
 *
 * Default-exported because `App` pulls this in through `React.lazy`, so none of
 * it is fetched at desktop widths.
 */
import { useState } from 'react';
import { useApp } from '@/app/AppContext';
import { selectCounts, selectFilterChips, selectFleet } from '@/app/selectors';
import { MobileTopBar } from './components/MobileTopBar';
import { ServerCardMobile } from './components/ServerCardMobile';
import { StatCues } from './components/StatCues';
import styles from './styles.module.css';

/** "3 hosts · 1 alert" — pluralised, counted over the WHOLE fleet, not the filtered view. */
function subtitle(total: number, alerts: number): string {
  const hosts = `${total} ${total === 1 ? 'host' : 'hosts'}`;
  return `${hosts} · ${alerts} ${alerts === 1 ? 'alert' : 'alerts'}`;
}

export default function FleetViewMobile() {
  const { state } = useApp();
  const servers = selectFleet(state);
  const counts = selectCounts(state);
  const chips = selectFilterChips(counts);

  // Chrome-only state — the query and status filter themselves live in the
  // shared reducer, so they survive a rotation into the desktop layout.
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const alerts = counts.warn + counts.crit;

  return (
    <div className={styles.screen} data-screen-label="Fleet (mobile)">
      <MobileTopBar
        chips={chips}
        searchOpen={searchOpen}
        onToggleSearch={() => setSearchOpen((v) => !v)}
        filterOpen={filterOpen}
        onToggleFilter={() => setFilterOpen((v) => !v)}
        onCloseFilter={() => setFilterOpen(false)}
      />

      <div className={styles.scroll}>
        <div className={styles.header}>
          <h1 className={styles.title}>Servers</h1>
          <span className={styles.subtitle}>{subtitle(counts.total, alerts)}</span>
        </div>

        <StatCues counts={counts} />

        {servers.length > 0 ? (
          <div className={styles.list}>
            {servers.map((s) => (
              <ServerCardMobile key={s.id} server={s} />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>No servers match your filter</div>
        )}
      </div>
    </div>
  );
}
