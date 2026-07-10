/**
 * Bottom sheet — the mobile home for the desktop `RailPanel`'s content.
 *
 * Renders the SAME six panels from the shared `PANELS` registry, with the SAME
 * `TimeRangeMenu` (Live / 1D / 7D / 1M / custom calendar) and the SAME
 * live-vs-history routing. Nothing here re-implements a panel; only the
 * container differs — a 360px side dock on desktop, a slide-up sheet here.
 *
 * Dismissal: the ✕ at the right of the header, or the backdrop.
 * Both call `onClose`, which hides ONLY the card. The subsystem stays
 * selected, so the rack remains in its component-alone (focused) view — closing
 * the card is not the same as clearing the selection. Use the ✕ in the floating
 * scene controls to step back out of the component view entirely.
 *
 * The sheet starts below the header (88px) plus the handoff's 10px gap, so the
 * server's identity and alert count stay visible while a panel is open.
 */
import { useEffect, useState } from 'react';
import { useApp } from '@/app/AppContext';
import { HISTORY_GRAPHS } from '../../components/historyConfig';
import { HistoryPanel } from '../../components/HistoryPanel';
import { NoTrendNotice } from '../../components/NoTrendNotice';
import { TimeRangeMenu, type TimeRange } from '../../components/TimeRangeMenu';
import { selectActiveComp } from '../../compView';
import { PANELS } from '../../panels/registry';
import styles from '../styles.module.css';

export interface MobileSheetProps {
  /** Card visibility. Independent of `state.selectedComp` (the 3D focus). */
  open: boolean;
  /** Hides the card, leaving the component focused in the scene. */
  onClose: () => void;
}

export function MobileSheet({ open, onClose }: MobileSheetProps) {
  const { state, compStates } = useApp();
  const sel = state.selectedComp;

  // Per-panel range, reset to Live whenever a different subsystem opens —
  // identical to RailPanel, so the two surfaces behave the same.
  const [range, setRange] = useState<TimeRange>({ key: 'live' });
  useEffect(() => {
    setRange({ key: 'live' });
  }, [sel]);

  if (!sel || !open) return null;

  const active = selectActiveComp(compStates, sel);
  const Panel = PANELS[sel];
  const isLive = range.key === 'live';
  const hasHistory = HISTORY_GRAPHS[sel].length > 0;

  return (
    <>
      <div className={styles.sheetBackdrop} onClick={onClose} aria-hidden />

      <div className={styles.sheet} role="dialog" aria-modal="true" aria-label={active.label}>
        <div
          className={styles.sheetHeader}
          style={{ background: `linear-gradient(90deg,${active.tint},transparent)` }}
        >
          <div className={styles.sheetTitleWrap}>
            <div className={styles.sheetTitle}>{active.label}</div>
            <TimeRangeMenu value={range} onChange={setRange} />
          </div>
          <button
            type="button"
            className={styles.sheetClose}
            onClick={onClose}
            aria-label="Close panel"
          >
            ✕
          </button>
        </div>

        <div className={styles.sheetBody}>
          {isLive ? <Panel /> : hasHistory ? <HistoryPanel comp={sel} range={range} /> : <NoTrendNotice />}
        </div>
      </div>
    </>
  );
}
