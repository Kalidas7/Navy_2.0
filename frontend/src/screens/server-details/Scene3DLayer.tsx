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
 */
import { useRef } from 'react';
import { useScene } from '@/three/useScene';
import { SceneCanvas } from '@/components/layout/SceneCanvas';
import { DetailView } from './index';

export default function Scene3DLayer() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const { markers } = useScene(canvasRef);

  return (
    <>
      <SceneCanvas ref={canvasRef} />
      <DetailView markers={markers} />
    </>
  );
}
