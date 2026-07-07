/**
 * Top-level app state shape and reducer.
 *
 * State model:
 *   route, homeStyle, query, filterStatus, servers, activeServerId,
 *   selectedComp, screenView, autoRotate, exploded, scene{Loading,Error},
 *   loadPct, comp(data), logs.
 *
 * `comp`/`logs` start empty and are overlaid with the backend's real payload on
 * entering a detail view. The localhost rack's live scalars come from the SSE
 * feed (SystemMetricsContext), not from here. The wall clock lives in its own
 * ClockContext (see ClockProvider), so its 1s tick doesn't churn this reducer.
 */
import { makeInitialServers, EMPTY_COMP } from '@/data/fleet';
import type {
  Server,
  CompKey,
  ScreenView,
  CompData,
  LogEntry,
  RackStatus,
} from '@/types';

export type Route = 'home' | 'detail';
export type HomeStyle = 'A' | 'B';
export type FilterStatus = 'all' | 'online' | 'warn' | 'crit';

export interface AppState {
  route: Route;
  homeStyle: HomeStyle;
  query: string;
  filterStatus: FilterStatus;
  servers: Server[];
  activeServerId: string;
  selectedComp: CompKey | null;
  screenView: ScreenView;
  /**
   * Stack of previously-visited Display-panel tabs, oldest→newest, used by the
   * Esc "go back one step" shortcut: each tab change pushes the outgoing tab;
   * Esc pops back to it. Empty ⇒ nothing to go back to ⇒ Esc closes the panel.
   * Reset whenever a component is (de)selected or the detail screen is entered.
   */
  screenViewHistory: ScreenView[];
  autoRotate: boolean;
  exploded: boolean;
  /**
   * When a component is focused (selectedComp set), controls what happens to the
   * OTHER meshes. false (default) = they are fully hidden, so only the focused
   * component shows. true = they stay visible but faded translucent (the old
   * "ghost" view). Toggled from the detail toolbar; no effect with no selection.
   */
  fadeOthers: boolean;
  /**
   * localhost-2 two-stage view (demo). false = Stage 1: BOTH racks shown, no
   * hotspot buttons, racks clickable. true = Stage 2: collapsed to the single
   * main rack with hotspot buttons + click-focus. Only meaningful for the
   * data-center rack; ignored by every other rack (always treated as collapsed).
   */
  rackCollapsed: boolean;
  sceneLoading: boolean;
  sceneError: string | null;
  loadPct: number;
  comp: CompData;
  logs: LogEntry[];
}

export type Action =
  | { type: 'SET_QUERY'; query: string }
  | { type: 'SET_FILTER'; filter: FilterStatus }
  | { type: 'SET_HOME_STYLE'; style: HomeStyle }
  | { type: 'ENTER_DETAIL'; id: string }
  | { type: 'BACK_HOME' }
  | { type: 'SELECT_COMP'; key: CompKey }
  | { type: 'CLOSE_MENU' }
  | { type: 'SET_SCREEN_VIEW'; view: ScreenView }
  | { type: 'TAB_BACK' }
  | { type: 'SET_AUTO_ROTATE'; value: boolean }
  | { type: 'SET_EXPLODED'; value: boolean }
  | { type: 'SET_FADE_OTHERS'; value: boolean }
  | { type: 'COLLAPSE_RACK' }
  | { type: 'EXPAND_RACKS' }
  | { type: 'SCENE_LOADING'; value: boolean }
  | { type: 'SCENE_ERROR'; error: string | null }
  | { type: 'LOAD_PCT'; pct: number }
  | { type: 'SET_SERVERS'; servers: Server[] }
  | { type: 'SET_COMP'; comp: CompData }
  | { type: 'SET_LOGS'; logs: LogEntry[] };

export interface InitOptions {
  autoRotateDefault: boolean;
}

export function makeInitialState(opts: InitOptions): AppState {
  const servers = makeInitialServers();
  const first = servers[0];
  return {
    route: 'home',
    homeStyle: 'A',
    query: '',
    filterStatus: 'all',
    servers,
    activeServerId: first.id,
    selectedComp: null,
    screenView: 'system',
    screenViewHistory: [],
    autoRotate: opts.autoRotateDefault,
    exploded: false,
    // Default: hide the other components when one is focused (fade off).
    fadeOthers: false,
    rackCollapsed: false,
    sceneLoading: true,
    sceneError: null,
    loadPct: 0,
    // Empty until the backend overlays real data on entering a detail view.
    comp: EMPTY_COMP,
    logs: [],
  };
}

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_QUERY':
      return { ...state, query: action.query };
    case 'SET_FILTER':
      return { ...state, filterStatus: action.filter };
    case 'SET_HOME_STYLE':
      return { ...state, homeStyle: action.style };
    case 'ENTER_DETAIL':
      return {
        ...state,
        route: 'detail',
        activeServerId: action.id,
        selectedComp: null,
        screenView: 'system',
        screenViewHistory: [],
        exploded: false,
        // Fade defaults OFF on entry; enabled per-selection from the toolbar.
        fadeOthers: false,
        // Start every detail entry in the two-rack (uncollapsed) stage. Only
        // localhost-2 shows two racks; other racks ignore this and render one.
        rackCollapsed: false,
        // Reset to empty; AppContext overlays the real backend payload (real
        // per-device data + host logs for localhost, empty for other racks).
        comp: EMPTY_COMP,
        logs: [],
      };
    case 'BACK_HOME':
      return { ...state, route: 'home', selectedComp: null };
    case 'SELECT_COMP':
      // Each new selection starts with fade OFF (only the focused component
      // shows); the user re-enables the ghost view per selection if they want it.
      // A fresh selection starts the tab history empty.
      return {
        ...state,
        selectedComp: action.key,
        screenView: 'system',
        screenViewHistory: [],
        autoRotate: false,
        fadeOthers: false,
      };
    case 'CLOSE_MENU':
      return { ...state, selectedComp: null, fadeOthers: false, screenViewHistory: [] };
    case 'SET_SCREEN_VIEW':
      // No-op when re-selecting the same tab; otherwise push the outgoing tab
      // onto the history stack so Esc can step back to it.
      if (action.view === state.screenView) return state;
      return {
        ...state,
        screenView: action.view,
        screenViewHistory: [...state.screenViewHistory, state.screenView],
      };
    case 'TAB_BACK': {
      // Pop the most recent previous tab. No-op if there's nothing to go back
      // to — the keyboard hook closes the panel in that case instead.
      if (state.screenViewHistory.length === 0) return state;
      const history = state.screenViewHistory.slice();
      const prev = history.pop() as ScreenView;
      return { ...state, screenView: prev, screenViewHistory: history };
    }
    case 'SET_AUTO_ROTATE':
      return { ...state, autoRotate: action.value };
    case 'SET_EXPLODED':
      return { ...state, exploded: action.value };
    case 'SET_FADE_OTHERS':
      return { ...state, fadeOthers: action.value };
    case 'COLLAPSE_RACK':
      // Click a rack (Stage 1 → Stage 2): show the single main rack + buttons.
      // Start un-exploded so the door/glass (hidden while exploded) are shown.
      return { ...state, rackCollapsed: true, exploded: false };
    case 'EXPAND_RACKS':
      // Back button (Stage 2 → Stage 1): show both racks again, hide buttons,
      // clear any focused subsystem, and reset explode so nothing stays hidden.
      return { ...state, rackCollapsed: false, selectedComp: null, exploded: false };
    case 'SCENE_LOADING':
      return { ...state, sceneLoading: action.value };
    case 'SCENE_ERROR':
      return { ...state, sceneError: action.error, sceneLoading: false };
    case 'LOAD_PCT':
      return { ...state, loadPct: action.pct };
    case 'SET_SERVERS':
      return { ...state, servers: action.servers };
    case 'SET_COMP':
      return { ...state, comp: action.comp };
    case 'SET_LOGS':
      return { ...state, logs: action.logs };
    default:
      return state;
  }
}

/** Severity sort order applied to the fleet list (crit → warn → online → standby). */
export const STATUS_PRIORITY: Record<RackStatus, number> = {
  crit: 0,
  warn: 1,
  online: 2,
  standby: 3,
};
