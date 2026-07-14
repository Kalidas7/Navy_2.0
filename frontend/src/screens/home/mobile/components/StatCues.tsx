/**
 * Stat cues — one pill per non-empty status, tapping toggles that status filter.
 * A second tap on the active pill clears it back to 'all', matching the handoff.
 *
 * Only statuses the reducer can actually filter on are shown (`FilterStatus` is
 * 'all' | 'online' | 'warn' | 'crit'). The backend fleet has no standby racks
 * today; if one is ever added it will still render in the card list — it just
 * won't get a cue pill until 'standby' joins FilterStatus.
 */
import { useApp } from '@/app/AppContext';
import type { FleetCounts } from '@/app/selectors';
import type { FilterStatus } from '@/app/store';
import { statusMeta } from '@/config/tokens';
import { rgba } from '@/lib/color';
import styles from '../styles.module.css';

type CueKey = Exclude<FilterStatus, 'all'>;

const CUES: { key: CueKey; label: string }[] = [
  { key: 'online', label: 'Online' },
  { key: 'warn', label: 'Warning' },
  { key: 'crit', label: 'Critical' },
];

export function StatCues({ counts }: { counts: FleetCounts }) {
  const { state, setFilter } = useApp();
  const shown = CUES.filter((c) => counts[c.key] > 0);
  if (shown.length === 0) return null;

  return (
    <div className={styles.cues}>
      {shown.map(({ key, label }) => {
        const on = state.filterStatus === key;
        const c = statusMeta(key).color;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            className={styles.cue}
            // Tapping the active pill clears the filter.
            onClick={() => setFilter(on ? 'all' : key)}
            style={{
              color: on ? c : '#6b7280',
              background: on ? rgba(c, 0.12) : '#ffffff',
              border: `1px solid ${on ? rgba(c, 0.55) : '#e2e5ea'}`,
            }}
          >
            <span
              className={styles.dot}
              style={{ background: c, boxShadow: `0 0 6px ${rgba(c, 0.6)}` }}
            />
            {counts[key]} {label}
          </button>
        );
      })}
    </div>
  );
}
