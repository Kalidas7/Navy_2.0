/**
 * Persistent 3D canvas layer (z-index 0). Always mounted; the scene controller
 * is attached here on first detail entry. The radial-gradient background shows
 * through before/while the model loads.
 *
 * Exposes the per-frame projected hotspot markers via render-prop so the detail
 * view can place its HTML markers.
 */
import { forwardRef } from 'react';

export const SceneCanvas = forwardRef<HTMLDivElement>(function SceneCanvas(_props, ref) {
  return (
    <div
      ref={ref}
      id="rk-scene"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        background:
          'radial-gradient(90% 70% at 50% 40%, #ffffff 0%, #eef1f5 55%, #e6e9ee 100%)',
      }}
    />
  );
});
