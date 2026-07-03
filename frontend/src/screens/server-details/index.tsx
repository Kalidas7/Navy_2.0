/**
 * 3D Detail screen — router over the persistent 3D canvas.
 *
 * The rack is a live host: its metrics stream from the SSE feed
 * (`useSystemMetrics`). It shows the two-rack `multi-view/` until the user
 * clicks a rack, then the `single-view/`. Both share `shared/DetailShell`;
 * view-specific chrome lives under `multi-view/` and `single-view/`.
 */
import { useApp } from '@/app/AppContext';
import { useSystemMetrics } from '@/app/SystemMetricsContext';
import type { MarkerPosition } from '@/three/SceneController';
import { SingleView } from './single-view';
import { MultiView } from './multi-view';

export interface DetailViewProps {
  markers: MarkerPosition[];
}

/** Choose the two-rack (multi) or single-rack view for the current stage. */
export function DetailView({ markers }: DetailViewProps) {
  const { state } = useApp();
  const { g, status } = useSystemMetrics();
  // Two-rack stage until the user collapses to the single rack.
  const showMulti = !state.rackCollapsed;

  return showMulti ? (
    <MultiView markers={markers} g={g} live status={status} offline={false} />
  ) : (
    <SingleView markers={markers} g={g} live status={status} offline={false} />
  );
}
