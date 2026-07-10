/**
 * Persistent 3D canvas layer (z-index 0). Always mounted; the scene controller
 * is attached here on first detail entry. The radial-gradient background shows
 * through before/while the model loads.
 *
 * Exposes the per-frame projected hotspot markers via render-prop so the detail
 * view can place its HTML markers.
 *
 * The top/bottom insets come from `--rk-scene-top` / `--rk-scene-bottom`, which
 * default to `0px` (see global.css) so this stays a full-bleed `inset: 0` layer
 * on desktop. The mobile detail screen raises them to carve out a scene slot
 * between the header and the dock, so the rack centers in the visible area
 * instead of behind the bottom chrome. A ResizeObserver on this host re-derives
 * the camera aspect, and hotspot markers project against its box — which is why
 * the mobile hotspot layer must use the same two variables.
 */
import { forwardRef } from 'react';

export const SceneCanvas = forwardRef<HTMLDivElement>(function SceneCanvas(_props, ref) {
  return (
    <div
      ref={ref}
      id="rk-scene"
      style={{
        position: 'absolute',
        top: 'var(--rk-scene-top, 0px)',
        right: 0,
        bottom: 'var(--rk-scene-bottom, 0px)',
        left: 0,
        zIndex: 0,
        background:
          'radial-gradient(90% 70% at 50% 40%, #ffffff 0%, #eef1f5 55%, #e6e9ee 100%)',
      }}
    />
  );
});
