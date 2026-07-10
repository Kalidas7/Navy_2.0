/**
 * Server Detail — mobile.
 *
 * An overlay on the SAME persistent three.js canvas the desktop view uses:
 * `Scene3DLayer` owns `useScene()` and hands the projected hotspot markers to
 * whichever view is active. One scene, one WebGL context, one GLB download.
 *
 * The two-stage rack flow is preserved exactly as on desktop:
 *   Stage 1 (rackCollapsed=false) — both racks, no subsystem chips, a hint to
 *                                   tap a rack. Tapping one collapses the view.
 *   Stage 2 (rackCollapsed=true)  — the single rack, hotspots, chips, and the
 *                                   ✕ step-back control.
 *
 * Selecting a subsystem (chip or hotspot) focuses it in the 3D view AND opens
 * `MobileSheet`, which renders the very same panels the desktop rail does.
 *
 * Card visibility is deliberately SEPARATE from `state.selectedComp`: dismissing
 * the card leaves the rack in its component-alone (focused) view rather than
 * snapping back to the whole rack. Clearing the focus is the job of the ✕ in the
 * floating scene controls; re-tapping the focused chip brings the card back.
 *
 * Not ported from the design prototype: its fake iOS status bar and its
 * hard-coded "⚠ 1 ALERT" pill.
 *
 * Default-exported because `Scene3DLayer` pulls this in through `React.lazy`,
 * so desktop never fetches it even though it shares the 3D route.
 */
import { useEffect, useState } from 'react';
import { useApp } from '@/app/AppContext';
import { useSystemMetrics } from '@/app/SystemMetricsContext';
import { selectActiveServer } from '@/app/selectors';
import type { MarkerPosition } from '@/three/SceneController';
import { Hotspots } from '../components/Hotspots';
import { ErrorOverlay, LoadingOverlay } from '../components/SceneOverlays';
import { MobileCompSelector } from './components/MobileCompSelector';
import { MobileDetailHeader } from './components/MobileDetailHeader';
import { MobileSheet } from './components/MobileSheet';
import { MobileTelemetryDock } from './components/MobileTelemetryDock';
import { SceneControls } from './components/SceneControls';
import styles from './styles.module.css';

export interface DetailViewMobileProps {
  markers: MarkerPosition[];
}

export default function DetailViewMobile({ markers }: DetailViewMobileProps) {
  const { state } = useApp();
  const { g, status, raw } = useSystemMetrics();

  const server = selectActiveServer(state);
  const collapsed = state.rackCollapsed;
  const sel = state.selectedComp;

  // The card's visibility, NOT the 3D focus. Picking a subsystem opens it;
  // dismissing the card leaves `selectedComp` set, so the rack stays in its
  // component-alone view. Clearing the focus (✕ in SceneControls) closes it.
  const [sheetOpen, setSheetOpen] = useState(false);
  useEffect(() => {
    setSheetOpen(sel != null);
  }, [sel]);

  // Stage 1 prompts for a rack; stage 2 prompts for a module until one is picked.
  const hint = state.sceneLoading
    ? null
    : !collapsed
      ? 'TAP A SERVER TO INSPECT'
      : !sel
        ? 'Tap a module — or pick below'
        : null;

  return (
    <div className={styles.screen} data-screen-label="3D Detail (mobile)">
      <MobileDetailHeader code={server.code} />

      {/* Lines up 1:1 with the inset canvas, so projected markers land correctly. */}
      <div className={styles.sceneLayer}>
        {/* labels off: left-side marker labels grow leftward and would run off a
            390px screen. The chip row already names every subsystem. */}
        <Hotspots markers={markers} labels={false} />
        <SceneControls />
        {hint && (
          <div className={styles.hint}>
            <span className={styles.hintDot} aria-hidden>◉</span>
            <span className={styles.hintText}>{hint}</span>
          </div>
        )}
      </div>

      <MobileTelemetryDock g={g} status={status} hasFrame={raw != null} />
      <MobileCompSelector
        showSubsystems={collapsed}
        sheetOpen={sheetOpen}
        onToggleSheet={() => setSheetOpen((v) => !v)}
      />

      <MobileSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />

      {state.sceneLoading && <LoadingOverlay pct={state.loadPct} />}
      {state.sceneError && <ErrorOverlay message={state.sceneError} />}
    </div>
  );
}
