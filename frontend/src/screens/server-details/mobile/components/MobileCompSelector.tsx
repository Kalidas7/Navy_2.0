/**
 * Component selector — the handoff's horizontally-scrollable chip row:
 * "⛶ Exploded", a hairline, then one chip per subsystem.
 *
 * Chips mirror the rack's hotspots exactly (same `selectCompButtons` view-model
 * the desktop toolbar uses), so tapping a chip and tapping a hotspot are the
 * same action.
 *
 * Tapping an unselected chip focuses that subsystem in the 3D view and opens its
 * card. Tapping the ALREADY-focused chip shows/hides the card while KEEPING the
 * component-alone view — it does not clear the focus. Clearing the focus is the
 * job of the ✕ in the floating scene controls.
 *
 * In the two-rack stage the subsystem chips are hidden — the same rule the
 * desktop `ControlToolbar hideSubsystems` follows — because no rack is chosen.
 *
 * Height is 56px, which `--rk-scene-bottom` depends on.
 */
import { useApp } from '@/app/AppContext';
import { colors } from '@/config/tokens';
import { selectCompButtons } from '../../compView';
import styles from '../styles.module.css';

/** COMPS labels are long ("DISPLAY PANEL"); the chip row uses the handoff's short forms. */
const SHORT_LABEL: Record<string, string> = {
  screen: 'Display',
  status: 'Status',
  drives: 'Drives',
  net: 'Network',
  fan: 'Fans',
  power: 'Power',
};

function chipStyle(active: boolean): React.CSSProperties {
  return {
    background: active ? 'rgba(37,99,235,.10)' : '#f4f6f8',
    color: active ? colors.accent : colors.textMid,
    border: `1px solid ${active ? colors.accent : '#e2e5ea'}`,
  };
}

export interface MobileCompSelectorProps {
  showSubsystems: boolean;
  /** Whether the focused subsystem's card is currently on screen. */
  sheetOpen: boolean;
  /** Show/hide the card for the already-focused subsystem. */
  onToggleSheet: () => void;
}

export function MobileCompSelector({
  showSubsystems,
  sheetOpen,
  onToggleSheet,
}: MobileCompSelectorProps) {
  const { state, compStates, toggleExplode, selectComp } = useApp();
  const buttons = showSubsystems ? selectCompButtons(compStates, state.selectedComp) : [];

  return (
    <div className={styles.selector}>
      <button
        type="button"
        className={styles.chip}
        style={chipStyle(state.exploded)}
        aria-pressed={state.exploded}
        onClick={toggleExplode}
      >
        <span className={styles.chipGlyph} aria-hidden>⛶</span>
        Exploded
      </button>

      {buttons.length > 0 && <span className={styles.chipRule} />}

      {buttons.map((b) => (
        <button
          key={b.key}
          type="button"
          className={styles.chip}
          style={chipStyle(b.selected)}
          aria-pressed={b.selected}
          aria-expanded={b.selected ? sheetOpen : undefined}
          // Focus it, or — if already focused — just show/hide its card, leaving
          // the component-alone view in place.
          onClick={() => (b.selected ? onToggleSheet() : selectComp(b.key))}
        >
          <span
            className={styles.chipGlyph}
            style={{ color: b.selected ? colors.accent : colors.textMuted }}
            aria-hidden
          >
            {b.glyph}
          </span>
          {SHORT_LABEL[b.key] ?? b.label}
        </button>
      ))}
    </div>
  );
}
