/**
 * App shell. Holds the persistent 3D canvas (always mounted at z-0) and the
 * scene controller (via useScene), then renders the active view on top based on
 * the URL:
 *   /            → Fleet (home)
 *   /server/:id  → Detail (3D)
 *
 * The URL is the source of truth for navigation. `RouteSync` reconciles the
 * reducer's route/activeServerId to whatever the URL currently is, so the rest
 * of the app (scene controller, selectors, panels) keeps reading plain state.
 * There is no in-app back button — the browser's Back/Forward buttons navigate.
 */
import { useEffect, useRef } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { useApp } from './AppContext';
import { routes } from './routes';
import { useScene } from '@/three/useScene';
import { SceneCanvas } from '@/components/layout/SceneCanvas';
import { FleetView } from '@/screens/home';
import { DetailView, type DetailViewProps } from '@/screens/server-details';

/**
 * Reconciles reducer state to the current URL, then renders the matching view.
 * `detailProps` is threaded from App so the persistent scene stays mounted once.
 */
function RouteSync({
  view,
  detailProps,
}: {
  view: 'home' | 'detail';
  detailProps: DetailViewProps;
}) {
  const { state, syncRoute } = useApp();
  const { id } = useParams<{ id: string }>();
  const target = view === 'detail' ? id ?? null : null;

  useEffect(() => {
    syncRoute(target);
  }, [target, syncRoute]);

  // A /server/:id for an unknown server redirects home rather than showing a
  // stale rack.
  if (view === 'detail' && id && !state.servers.some((s) => s.id === id)) {
    return <Navigate to={routes.fleet} replace />;
  }
  return view === 'detail' ? <DetailView {...detailProps} /> : <FleetView />;
}

export function App() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const { markers } = useScene(canvasRef);

  return (
    <div className="rk-app">
      <SceneCanvas ref={canvasRef} />
      <Routes>
        <Route path={routes.fleet} element={<RouteSync view="home" detailProps={{ markers }} />} />
        <Route
          path={routes.serverDetailPattern}
          element={<RouteSync view="detail" detailProps={{ markers }} />}
        />
        <Route path="*" element={<Navigate to={routes.fleet} replace />} />
      </Routes>
    </div>
  );
}
