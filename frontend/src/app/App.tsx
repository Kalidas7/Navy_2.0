/**
 * App shell. Renders the active view based on the URL:
 *   /            → Fleet (home) — a flat list, NO 3D, so it never loads three.js
 *   /server/:id  → Detail (3D) — the heavy WebGL layer, code-split via React.lazy
 *
 * The URL is the source of truth for navigation. `RouteSync` reconciles the
 * reducer's route/activeServerId to whatever the URL currently is, so the rest
 * of the app (scene controller, selectors, panels) keeps reading plain state.
 * There is no in-app back button — the browser's Back/Forward buttons navigate.
 *
 * The 3D layer (canvas + three.js scene + detail view) lives in a lazily-loaded
 * chunk (`Scene3DLayer`) that is only fetched when a rack's detail route is
 * active. This keeps three.js (~600 KB) out of the initial/home bundle.
 *
 * Narrow viewports render a separate tree (see `useViewportTier`). The desktop
 * layout has no fluid fallback — it clips rather than reflows below ~960px — so
 * phone/tablet get purpose-built screens instead of squeezed ones. Those screens
 * are lazily loaded too, meaning a desktop session never fetches them, and the
 * two trees are mutually exclusive (never mounted together).
 */
import { Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { useApp } from './AppContext';
import { routes } from './routes';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useIsMobile } from '@/hooks/useViewportTier';
import { FleetView } from '@/screens/home';
import { DemoBanner } from '@/components/common/DemoBanner';

// Heavy, 3D-only. Split into its own chunk so the home route stays light.
const Scene3DLayer = lazy(() => import('@/screens/server-details/Scene3DLayer'));

// Phone/tablet fleet screen. Never fetched at desktop widths.
const FleetViewMobile = lazy(() => import('@/screens/home/mobile'));

/**
 * Reconciles reducer state to the current URL, then renders the matching view.
 * The detail view's 3D layer is lazy-loaded under Suspense.
 */
function RouteSync({ view }: { view: 'home' | 'detail' }) {
  const { state, syncRoute } = useApp();
  const { id } = useParams<{ id: string }>();
  const isMobile = useIsMobile();
  const target = view === 'detail' ? id ?? null : null;

  useEffect(() => {
    syncRoute(target);
  }, [target, syncRoute]);

  // A /server/:id for an unknown server redirects home rather than showing a
  // stale rack.
  if (view === 'detail' && id && !state.servers.some((s) => s.id === id)) {
    return <Navigate to={routes.fleet} replace />;
  }

  if (view === 'detail') {
    // Suspense fallback is null: the 3D layer paints its own loading overlay
    // once mounted, and the chunk fetch is quick on a warm cache. The mobile
    // detail view is chosen INSIDE this chunk, so both tiers share one scene.
    return (
      <Suspense fallback={null}>
        <Scene3DLayer />
      </Suspense>
    );
  }
  if (isMobile) {
    return (
      <Suspense fallback={null}>
        <FleetViewMobile />
      </Suspense>
    );
  }
  return <FleetView />;
}

export function App() {
  useKeyboardShortcuts();

  return (
    <div className="rk-app">
      <DemoBanner />
      <Routes>
        <Route path={routes.fleet} element={<RouteSync view="home" />} />
        <Route path={routes.serverDetailPattern} element={<RouteSync view="detail" />} />
        <Route path="*" element={<Navigate to={routes.fleet} replace />} />
      </Routes>
    </div>
  );
}
