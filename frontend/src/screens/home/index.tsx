/**
 * Home / Fleet screen — searchable, filterable list of every rack in the fleet,
 * rendered as a grid (layout A) or roster (layout B). Sits above the persistent
 * 3D canvas at z-index 10.
 *
 * Static layout/background styling lives in styles.module.css; per-rack colours
 * stay inline in the child components (they are data-driven).
 */
import { useApp } from '@/app/AppContext';
import {
  selectFleet,
  selectCounts,
  selectFilterChips,
  selectVesselStats,
} from '@/app/selectors';
import { FleetHeader } from './components/FleetHeader';
import { FleetToolbar } from './components/FleetToolbar';
import { RackCard } from './components/RackCard';
import { RackRow } from './components/RackRow';
import { RosterSidebar } from './components/RosterSidebar';
import styles from './styles.module.css';

export function FleetView() {
  const { state } = useApp();
  const servers = selectFleet(state);
  const counts = selectCounts(state);
  const chips = selectFilterChips(counts);
  const vessels = selectVesselStats(state);
  const noResults = servers.length === 0;

  return (
    <div data-screen-label="Home" className={styles.screen}>
      <div className={styles.content}>
        <FleetHeader />
        <FleetToolbar chips={chips} />

        {state.homeStyle === 'A' && (
          <div className={styles.grid}>
            {servers.map((s) => (
              <RackCard key={s.id} server={s} />
            ))}
          </div>
        )}

        {state.homeStyle === 'B' && (
          <div className={styles.roster}>
            <RosterSidebar vessels={vessels} />
            <div className={styles.rosterList}>
              {servers.map((s) => (
                <RackRow key={s.id} server={s} />
              ))}
            </div>
          </div>
        )}

        {noResults && (
          <div className={styles.empty}>NO RACKS MATCH FILTER</div>
        )}
      </div>
    </div>
  );
}
