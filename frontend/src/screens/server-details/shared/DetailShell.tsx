/**
 * DetailShell — the COMMON 3D-detail shell shared by both the single-rack view
 * and the datacenter two-rack view.
 *
 * It owns everything that is identical across views: the root overlay container,
 * ambient overlays, projected hotspot markers, the top bar, the telemetry dock,
 * and the loading/error overlays. What DIFFERS per view (the toolbar variant,
 * the hint pill, the close button, the selection rail) is passed in as
 * `children`, which render on top of this shell. This keeps the canvas/topbar/
 * dock in ONE place instead of duplicated per view.
 */
import type { ReactNode } from 'react';
import { useApp } from '@/app/AppContext';
import { useGraphValues } from '@/hooks/useGraphValues';
import type { MarkerPosition } from '@/three/SceneController';
import { TopBar } from '@/components/common/TopBar';
import { AmbientOverlays } from '../components/AmbientOverlays';
import { ServerNameCard } from '../components/ServerNameCard';
import { Hotspots } from '../components/Hotspots';
import { TelemetryDock } from '../components/TelemetryDock';
import { LoadingOverlay, ErrorOverlay } from '../components/SceneOverlays';
import styles from '../styles.module.css';

export interface DetailShellProps {
  markers: MarkerPosition[];
  g: ReturnType<typeof useGraphValues>;
  live: boolean;
  status?: string;
  offline: boolean;
  /** View-specific floating chrome (toolbar, hints, buttons, rail). */
  children?: ReactNode;
}

export function DetailShell({ markers, g, live, status, offline, children }: DetailShellProps) {
  const { state } = useApp();

  return (
    <div className={styles.screen} data-screen-label="3D Detail">
      <AmbientOverlays />

      {/* Hotspot markers projected onto the model. The controller supplies an
          empty list in the two-rack stage, so no markers show there. */}
      <Hotspots markers={markers} />

      {/* Shared header (same component as the Home screen) + the active rack's
          identity in a floating card below it. */}
      <TopBar variant="detail" />
      <ServerNameCard />

      {/* View-specific chrome (toolbar variant, hint, close button, rail). */}
      {children}

      <TelemetryDock g={g} live={live} status={status} offline={offline} />

      {state.sceneLoading && <LoadingOverlay pct={state.loadPct} />}
      {state.sceneError && <ErrorOverlay message={state.sceneError} />}
    </div>
  );
}
