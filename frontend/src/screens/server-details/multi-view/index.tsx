/**
 * Multi-view — the datacenter (localhost-2) two-rack Stage 1.
 *
 * Shows BOTH identical racks side by side with NO hotspot buttons and the
 * subsystem quick-buttons hidden; only a hint prompting the user to click a
 * rack. Clicking either rack (handled in SceneController via raycast) collapses
 * to the single-rack view. This view is localhost-2 only — every other rack
 * renders the single-view directly.
 */
import { useApp } from '@/app/AppContext';
import { useGraphValues } from '@/hooks/useGraphValues';
import type { MarkerPosition } from '@/three/SceneController';
import { DetailShell } from '../shared/DetailShell';
import { ControlToolbar } from '../components/ControlToolbar';
import { RackSelectHint } from './RackSelectHint';

export interface MultiViewProps {
  markers: MarkerPosition[];
  g: ReturnType<typeof useGraphValues>;
  live: boolean;
  status?: string;
  offline: boolean;
}

export function MultiView({ markers, g, live, status, offline }: MultiViewProps) {
  const { state } = useApp();

  return (
    <DetailShell markers={markers} g={g} live={live} status={status} offline={offline}>
      {/* Rotate/explode stay available; the six subsystem buttons are hidden
          until a rack is picked. */}
      <ControlToolbar hideSubsystems />
      {!state.sceneLoading && <RackSelectHint />}
    </DetailShell>
  );
}
