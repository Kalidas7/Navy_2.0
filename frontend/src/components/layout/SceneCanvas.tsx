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
          'radial-gradient(120% 100% at 50% 18%, #0d1922 0%, #08111a 38%, #05080b 100%)',
      }}
    />
  );
});
