/**
 * The heavy 3D layer — the persistent WebGL canvas, the three.js scene
 * controller (via `useScene`), and the detail view that reads its projected
 * hotspot markers.
 *
 * This module (and everything it pulls in, most importantly three.js ~600 KB)
 * is the target of a `React.lazy` boundary in App: it is only imported when the
 * user actually opens a rack's detail route, so the fleet/home page no longer
 * ships the 3D engine in its initial bundle. Keep all three.js-touching imports
 * BEHIND this file — importing `useScene`/`SceneController`/`three` from an
 * eagerly-loaded module would defeat the split.
 *
 * The desktop and mobile detail views swap HERE, above `DetailView`, so the
 * scene, its controller, and its markers are created exactly once and shared.
 * The mobile view is itself lazy so a desktop session never fetches it.
 */
import { Suspense, lazy, useRef } from 'react';
import { useScene } from '@/three/useScene';
import { SceneCanvas } from '@/components/layout/SceneCanvas';
import { useIsMobile } from '@/hooks/useViewportTier';
import { DetailView } from './index';

const DetailViewMobile = lazy(() => import('./mobile'));

export default function Scene3DLayer() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const { markers } = useScene(canvasRef);
  const isMobile = useIsMobile();

  return (
    <>
      <SceneCanvas ref={canvasRef} />
      {isMobile ? (
        <Suspense fallback={null}>
          <DetailViewMobile markers={markers} />
        </Suspense>
      ) : (
        <DetailView markers={markers} />
      )}
    </>
  );
}
