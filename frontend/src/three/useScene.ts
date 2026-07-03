/**
 * useScene — React bridge to the SceneController.
 *
 * Lazily creates the controller when the detail route becomes active (so the
 * GLB only loads on first entry), keeps it in sync with autoRotate / exploded,
 * and surfaces the per-frame projected hotspot positions for the React markers.
 */
import { useEffect, useRef, useState } from 'react';
import { SceneController, type MarkerPosition } from './SceneController';
import { useApp } from '@/app/AppContext';
import { modelForServer } from '@/data/fleet';

export function useScene(hostRef: React.RefObject<HTMLDivElement | null>) {
  const { state, dispatch } = useApp();
  const controllerRef = useRef<SceneController | null>(null);
  const [markers, setMarkers] = useState<MarkerPosition[]>([]);

  const isDetail = state.route === 'detail';
  // Which 3D model the active rack renders. Live hosts share the same live feed
  // and panels; only the model differs (localhost-2 → data-center rack). Keyed
  // on the URL so navigating directly between two live cards rebuilds the scene
  // with the correct model instead of keeping the first one.
  const model = modelForServer(state.activeServerId);

  // (Re)create the controller when entering detail or when the model changes,
  // so the GLB only loads on entry and swaps when the active rack's model does.
  useEffect(() => {
    if (!isDetail) return;
    const host = hostRef.current;
    if (!host) return;

    try {
      controllerRef.current = new SceneController(host, state.autoRotate, model, {
        onLoadProgress: (pct) => dispatch({ type: 'LOAD_PCT', pct }),
        onLoaded: () => dispatch({ type: 'SCENE_LOADING', value: false }),
        onError: (message) => dispatch({ type: 'SCENE_ERROR', error: message }),
        onMarkers: setMarkers,
        // datacenter Stage 1: clicking either rack collapses to the single rack.
        onRackClick: () => dispatch({ type: 'COLLAPSE_RACK' }),
      });
    } catch (err) {
      dispatch({ type: 'SCENE_ERROR', error: String((err as Error)?.message ?? err) });
    }

    return () => {
      controllerRef.current?.dispose();
      controllerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDetail, model.url]);

  // Keep auto-rotate in sync.
  useEffect(() => {
    controllerRef.current?.setAutoRotate(state.autoRotate);
  }, [state.autoRotate]);

  // Keep explode state in sync.
  useEffect(() => {
    controllerRef.current?.setExploded(state.exploded);
  }, [state.exploded]);

  // Click-to-focus: forward the selected hotspot to the controller so the
  // data-center rack brightens the mapped mesh and fades the rest. The
  // controller no-ops for the default rack, so localhost-1 is never dimmed.
  useEffect(() => {
    controllerRef.current?.setFocus(state.selectedComp);
  }, [state.selectedComp, model.url]);

  // Two-stage collapse: forward the collapsed flag so the datacenter rack shows
  // both racks (Stage 1) or the single centered rack (Stage 2). No-op elsewhere.
  useEffect(() => {
    controllerRef.current?.setCollapsed(state.rackCollapsed);
  }, [state.rackCollapsed, model.url]);

  return { markers: isDetail ? markers : [] };
}
