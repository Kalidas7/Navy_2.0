/**
 * Floating 3D control cluster — the mobile home for the three desktop
 * `ControlToolbar` actions the handoff's chip row has no slot for.
 *
 *   ⟳  auto-rotate            (always)
 *   ◐  ghost / fade others    (only while a subsystem is focused — same rule
 *                              the desktop toolbar uses, since the toggle does
 *                              nothing otherwise)
 *   ✕  step back              (only in the single-rack stage: first tap clears
 *                              the focused subsystem, a second returns to the
 *                              two-rack stage — identical to ExpandRacksButton)
 *
 * Sits over the scene rather than in the chip row, so the row stays exactly as
 * the handoff specifies it.
 */
import { useApp } from '@/app/AppContext';
import { colors } from '@/config/tokens';
import styles from '../styles.module.css';

function toggleStyle(active: boolean): React.CSSProperties {
  return active
    ? { background: 'rgba(37,99,235,.10)', borderColor: colors.accent, color: colors.accent }
    : {};
}

export function SceneControls() {
  const { state, toggleAutoRotate, toggleFadeOthers, closeMenu, expandRacks } = useApp();

  const hasSelection = !!state.selectedComp;
  const collapsed = state.rackCollapsed;

  // One step back: focused subsystem → single rack → both racks.
  const stepBack = hasSelection ? closeMenu : expandRacks;
  const stepBackLabel = hasSelection ? 'Back to server view' : 'Back to both servers';

  return (
    <div className={styles.controls}>
      <button
        type="button"
        className={styles.ctrlBtn}
        style={toggleStyle(state.autoRotate)}
        aria-pressed={state.autoRotate}
        aria-label="Auto-rotate"
        onClick={toggleAutoRotate}
      >
        ⟳
      </button>

      {hasSelection && (
        <button
          type="button"
          className={styles.ctrlBtn}
          style={toggleStyle(state.fadeOthers)}
          aria-pressed={state.fadeOthers}
          aria-label={state.fadeOthers ? 'Ghost view: on' : 'Ghost view: off'}
          onClick={toggleFadeOthers}
        >
          ◐
        </button>
      )}

      {collapsed && (
        <button
          type="button"
          className={styles.ctrlBtn}
          style={{ color: colors.accent }}
          aria-label={stepBackLabel}
          onClick={stepBack}
        >
          ✕
        </button>
      )}
    </div>
  );
}
