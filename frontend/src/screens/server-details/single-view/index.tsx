/**
 * Single-view — the one-rack detail experience (Stage 2).
 *
 * Reached when the rack collapses from the two-rack stage. Renders the shared
 * DetailShell plus the single-rack chrome: the full control toolbar (with the
 * six subsystem buttons), the "select a node" hint, the selection rail panel,
 * and the close (✕) button that returns to the two-rack stage.
 */
import { useApp } from '@/app/AppContext';
import { useGraphValues } from '@/hooks/useGraphValues';
import { DetailShell } from '../shared/DetailShell';
import { ControlToolbar } from '../components/ControlToolbar';
import { SelectHint } from '../components/SelectHint';
import { RailPanel } from '../components/RailPanel';
import { ExpandRacksButton } from '../multi-view/ExpandRacksButton';
import type { MarkerPosition } from '@/three/SceneController';

export interface SingleViewProps {
  markers: MarkerPosition[];
  g: ReturnType<typeof useGraphValues>;
  live: boolean;
  status?: string;
  offline: boolean;
}

export function SingleView({ markers, g, live, status, offline }: SingleViewProps) {
  const { state } = useApp();

  const hasSelection = !!state.selectedComp;
  const noSelection = !hasSelection && !state.sceneLoading;

  return (
    <DetailShell markers={markers} g={g} live={live} status={status} offline={offline}>
      <ControlToolbar />
      {noSelection && <SelectHint />}
      {hasSelection && <RailPanel />}
      <ExpandRacksButton />
    </DetailShell>
  );
}
