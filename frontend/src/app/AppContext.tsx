/**
 * AppProvider — wires the reducer, the theme, and the clock together, and
 * exposes a typed `useApp()` hook.
 *
 * There is no client-side simulation: the localhost rack's live data comes from
 * the SSE feed (SystemMetricsContext) and every other rack renders "—". The only
 * timer here is the 1s wall clock.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  appReducer,
  makeInitialState,
  type AppState,
  type Action,
  type FilterStatus,
  type HomeStyle,
} from './store';
import { offlineStates, isLiveHost } from '@/data/fleet';
import { useSystemMetrics } from '@/app/SystemMetricsContext';
import { api, ApiError } from '@/api/client';
import { routes } from './routes';
import { fmtClock } from '@/lib/clock';
import { defaultTheme, type ThemeConfig } from '@/config/theme';
import type { CompKey, CompStates, ScreenView } from '@/types';

interface AppContextValue {
  state: AppState;
  theme: ThemeConfig;
  /** health states of the active rack's subsystems */
  compStates: CompStates;
  // intentful action creators (clearer call sites than raw dispatch)
  setQuery: (q: string) => void;
  setFilter: (f: FilterStatus) => void;
  setHomeStyle: (s: HomeStyle) => void;
  enterDetail: (id: string) => void;
  backHome: () => void;
  /** Reconcile the reducer route to a URL. `null` id ⇒ fleet home. Used by RouteSync. */
  syncRoute: (id: string | null) => void;
  selectComp: (key: CompKey) => void;
  closeMenu: () => void;
  setScreenView: (v: ScreenView) => void;
  /** Esc step-back: pop to the previous Display-panel tab. */
  tabBack: () => void;
  toggleAutoRotate: () => void;
  toggleExplode: () => void;
  /** Toggle whether non-focused components fade (ghost) or hide entirely. */
  toggleFadeOthers: () => void;
  /** localhost-2 two-stage: collapse the two racks to the single main rack. */
  collapseRack: () => void;
  /** localhost-2 two-stage: return from the single rack to the two-rack view. */
  expandRacks: () => void;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({
  theme = defaultTheme,
  children,
}: {
  theme?: ThemeConfig;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(appReducer, { autoRotateDefault: theme.autoRotateDefault }, makeInitialState);

  // The shared live host feed (SSE). Its per-device `components` drive the
  // localhost detail panels — one source of truth, no separate poll.
  const liveMetrics = useSystemMetrics();

  /** The user's preferred auto-rotate setting, restored when closing a panel. */
  const userAutoRotateRef = useRef(theme.autoRotateDefault);

  // Latest state for use inside the stable interval callback.
  const stateRef = useRef(state);
  stateRef.current = state;

  // Subsystem health for the active rack. We don't fabricate warn/crit states:
  // localhost's real health is reflected by its component payload; every rack
  // here shows a neutral (all-"ok") set so nothing invents an alert.
  const compStates = useMemo<CompStates>(() => offlineStates(), []);

  // ---- wall clock (1000ms) ----
  useEffect(() => {
    const clockTimer = setInterval(() => {
      dispatch({ type: 'SET_CLOCK', clock: fmtClock() });
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // ---- hydrate the fleet from the Django backend (once, on mount) ----
  // The initial state carries only a placeholder localhost rack; this replaces
  // the whole list with the backend's authoritative rows (the real localhost
  // rack + the empty INS shells). If the backend is unreachable we keep the
  // placeholder so the app still runs — it just shows "—" until the API returns.
  useEffect(() => {
    const controller = new AbortController();
    api
      .fleet(controller.signal)
      .then((servers) => {
        if (!servers.length) return;
        dispatch({ type: 'SET_SERVERS', servers });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        const detail = err instanceof ApiError ? err.message : String(err);
        // eslint-disable-next-line no-console
        console.warn(`[fleet] backend unreachable, showing "—" until it returns — ${detail}`);
      });
    return () => controller.abort();
  }, []);

  // ---- localhost component readouts: driven by the SSE feed (no polling) ----
  // The per-device payload (fans/disks/NICs/power/status) now rides on each SSE
  // frame alongside the scalar cards, so both come from the SAME source and can
  // never disagree due to separate refresh cadences. When the localhost detail
  // view is active, mirror every fresh frame into state.comp. No 5s poll, no
  // second HTTP source. (Non-localhost racks have no live components — they keep
  // the empty payload from ENTER_DETAIL and render "—".)
  useEffect(() => {
    if (state.route !== 'detail') return;
    if (!isLiveHost(state.activeServerId)) return;
    if (!liveMetrics.components) return;
    dispatch({ type: 'SET_COMP', comp: liveMetrics.components });
  }, [state.route, state.activeServerId, liveMetrics.components]);

  const navigate = useNavigate();

  // Reducer side-effects for entering a server's detail, factored out so both
  // the URL-sync layer (RouteSync) and the imperative enterDetail() run the same
  // path. Idempotent: re-running for the already-active server is a no-op.
  /** Aborts the in-flight detail fetch when the user navigates away/again. */
  const detailFetchRef = useRef<AbortController | null>(null);

  const applyDetailRoute = (id: string) => {
    if (stateRef.current.route === 'detail' && stateRef.current.activeServerId === id) return;
    const srv = stateRef.current.servers.find((s) => s.id === id);
    if (!srv) return;
    // ENTER_DETAIL resets comp/logs to the empty set, so panels render
    // "—"/"NO LIVE FEED" immediately (no stale data from the previous rack)
    // until the real backend payload below arrives.
    dispatch({ type: 'ENTER_DETAIL', id });
    dispatch({ type: 'SET_AUTO_ROTATE', value: userAutoRotateRef.current });

    // Overlay authoritative component + log data from the backend. For the
    // localhost rack this is real per-device data + real host logs; for every
    // other rack it's an empty payload (panels stay "—"). Backend down ⇒ the
    // empty set from ENTER_DETAIL remains.
    detailFetchRef.current?.abort();
    const controller = new AbortController();
    detailFetchRef.current = controller;
    Promise.allSettled([
      api.components(id, controller.signal),
      api.logs(id, controller.signal),
    ]).then(([comp, logs]) => {
      if (controller.signal.aborted) return;
      // Ignore if the user has since navigated to a different rack.
      if (stateRef.current.activeServerId !== id) return;
      if (comp.status === 'fulfilled') dispatch({ type: 'SET_COMP', comp: comp.value });
      if (logs.status === 'fulfilled') dispatch({ type: 'SET_LOGS', logs: logs.value });
    });
  };

  // Keep the exposed action creators referentially stable regardless of state,
  // and always read the freshest state via stateRef.
  const applyDetailRouteRef = useRef(applyDetailRoute);
  applyDetailRouteRef.current = applyDetailRoute;

  // Referentially stable so RouteSync's effect only fires on real URL changes.
  const syncRoute = useCallback((id: string | null) => {
    if (id == null) {
      if (stateRef.current.route !== 'home') dispatch({ type: 'BACK_HOME' });
      return;
    }
    applyDetailRouteRef.current(id);
  }, []);

  const value = useMemo<AppContextValue>(() => {
    return {
      state,
      theme,
      compStates,
      dispatch,
      setQuery: (q) => dispatch({ type: 'SET_QUERY', query: q }),
      setFilter: (f) => dispatch({ type: 'SET_FILTER', filter: f }),
      setHomeStyle: (s) => dispatch({ type: 'SET_HOME_STYLE', style: s }),
      // Navigation is URL-driven: clicking a card changes the URL, and RouteSync
      // reconciles the reducer to match. This gives real, bookmarkable pages and
      // makes the browser Back/Forward buttons the canonical way to navigate.
      enterDetail: (id) => {
        if (!state.servers.some((s) => s.id === id)) return;
        navigate(routes.serverDetail(id));
      },
      backHome: () => navigate(routes.fleet),
      syncRoute,
      selectComp: (key) => dispatch({ type: 'SELECT_COMP', key }),
      closeMenu: () => {
        dispatch({ type: 'CLOSE_MENU' });
        dispatch({ type: 'SET_AUTO_ROTATE', value: userAutoRotateRef.current });
      },
      setScreenView: (v) => dispatch({ type: 'SET_SCREEN_VIEW', view: v }),
      tabBack: () => dispatch({ type: 'TAB_BACK' }),
      toggleAutoRotate: () => {
        const next = !state.autoRotate;
        userAutoRotateRef.current = next;
        dispatch({ type: 'SET_AUTO_ROTATE', value: next });
      },
      toggleExplode: () => dispatch({ type: 'SET_EXPLODED', value: !state.exploded }),
      toggleFadeOthers: () => dispatch({ type: 'SET_FADE_OTHERS', value: !state.fadeOthers }),
      collapseRack: () => dispatch({ type: 'COLLAPSE_RACK' }),
      expandRacks: () => dispatch({ type: 'EXPAND_RACKS' }),
    };
  }, [state, theme, compStates, navigate, syncRoute]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
}
