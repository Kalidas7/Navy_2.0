/**
 * Top-level app state shape and reducer.
 *
 * State model:
 *   route, homeStyle, query, filterStatus, servers, activeServerId,
 *   selectedComp, screenView, autoRotate, exploded, scene{Loading,Error},
 *   loadPct, clock, comp(data), logs.
 *
 * `comp`/`logs` start empty and are overlaid with the backend's real payload on
 * entering a detail view. The localhost rack's live scalars come from the SSE
 * feed (SystemMetricsContext), not from here.
 */
import { fmtClock } from '@/lib/clock';
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
  autoRotate: boolean;
  exploded: boolean;
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
  clock: string;
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
  | { type: 'SET_AUTO_ROTATE'; value: boolean }
  | { type: 'SET_EXPLODED'; value: boolean }
  | { type: 'COLLAPSE_RACK' }
  | { type: 'EXPAND_RACKS' }
  | { type: 'SCENE_LOADING'; value: boolean }
  | { type: 'SCENE_ERROR'; error: string | null }
  | { type: 'LOAD_PCT'; pct: number }
  | { type: 'SET_CLOCK'; clock: string }
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
    autoRotate: opts.autoRotateDefault,
    exploded: false,
    rackCollapsed: false,
    sceneLoading: true,
    sceneError: null,
    loadPct: 0,
    clock: fmtClock(),
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
        exploded: false,
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
      return { ...state, selectedComp: action.key, screenView: 'system', autoRotate: false };
    case 'CLOSE_MENU':
      return { ...state, selectedComp: null };
    case 'SET_SCREEN_VIEW':
      return { ...state, screenView: action.view };
    case 'SET_AUTO_ROTATE':
      return { ...state, autoRotate: action.value };
    case 'SET_EXPLODED':
      return { ...state, exploded: action.value };
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
    case 'SET_CLOCK':
      return { ...state, clock: action.clock };
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
