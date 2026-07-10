/**
 * Mobile detail header: brand + "‹ SERVER-CODE" + alerts.
 *
 * There is no separate "← Fleet" button: the whole brand block is the back
 * affordance (the "‹" chevron marks it), so the back path is preserved without
 * spending a second control on it.
 *
 * The handoff shows a hard-coded `⚠ 1 ALERT` pill here. We render the real
 * `NotificationsMenu` instead — the same component the desktop bar uses — so the
 * count reflects the host's actual warn/crit subsystems, whatever that is.
 *
 * Height is 54px, which `--rk-scene-top` depends on.
 */
import { useApp } from '@/app/AppContext';
import { NotificationsMenu } from '@/components/common/NotificationsMenu';
import styles from '../styles.module.css';

export interface MobileDetailHeaderProps {
  code: string;
}

export function MobileDetailHeader({ code }: MobileDetailHeaderProps) {
  const { backHome } = useApp();

  return (
    <div className={styles.topbar}>
      <button type="button" className={styles.brand} onClick={backHome} aria-label="Back to fleet">
        <span className={styles.brandTile} aria-hidden>▣</span>
        <span className={styles.crumb} aria-hidden>‹</span>
        <span className={styles.srvName}>{code}</span>
      </button>
      <NotificationsMenu variant="detail" />
    </div>
  );
}
