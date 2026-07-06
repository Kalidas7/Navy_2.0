import type { CompDef } from '@/types';

/**
 * The six selectable subsystems and their 3D hotspot world-positions.
 * The `pos` values are tuned to the normalized rack footprint — re-author them
 * if the model changes.
 */
// `side` splits the floating markers across both sides of the model so they
// aren't all stacked on the right (per the design handoff: screen + status on
// the right; drives, net, fan, power on the left). Purely a label-layout hint.
export const COMPS: CompDef[] = [
  { key: 'screen', label: 'DISPLAY PANEL', glyph: '▤', pos: [1.62, 3.15, 1.02], side: 'right' },
  { key: 'status', label: 'STATUS ARRAY', glyph: '◉', pos: [1.66, 4.35, 1.02], side: 'right' },
  { key: 'drives', label: 'DRIVE BAY', glyph: '▦', pos: [0.05, 3.55, 0.98], side: 'left' },
  { key: 'net', label: 'NETWORK PORTS', glyph: '⇄', pos: [0.05, 2.6, 0.98], side: 'left' },
  { key: 'fan', label: 'COOLING FANS', glyph: '❋', pos: [0.05, 1.55, 0.98], side: 'left' },
  { key: 'power', label: 'POWER UNIT', glyph: '⏻', pos: [0.05, 0.55, 0.98], side: 'left' },
];

/** Display-panel sub-tabs, in order. */
export const SCREEN_TABS: { key: string; label: string }[] = [
  { key: 'system', label: 'SYSTEM' },
  { key: 'network', label: 'NETWORK' },
  { key: 'radar', label: 'RADAR' },
  { key: 'power', label: 'POWER' },
  { key: 'logs', label: 'LOGS' },
];

/** Path to the rack model (data-center rack), served from /public. */
export const GLB_URL_DATACENTER = '/assets/models/data-center-server-rack.glb';

/**
 * The 3D model config: the GLB to load and whether to normalize it into the
 * scene's canonical footprint. The data-center model is authored at a wildly
 * different scale (~250 units deep) and pivot, so it is recentered + uniformly
 * scaled at load time (`normalize: true`). This is the app's single model; a new
 * card would supply its own config of the same shape.
 */
export interface ModelConfig {
  url: string;
  normalize: boolean;
}

export const MODEL_DATACENTER: ModelConfig = {
  url: GLB_URL_DATACENTER,
  normalize: true,
};

/**
 * DEMO-ONLY hotspot→mesh mapping for the data-center model (localhost-2). The
 * model's meshes are NOT named per-subsystem, so this is a deliberately
 * arbitrary but "closest-meaningful" pick per hotspot — enough to demo the
 * click-to-focus effect (clicking a hotspot brightens its mapped mesh and fades
 * the rest). Every hotspot maps to a distinct SERVER BLADE: the structural parts
 * (case/door/glass/back) are removed in the exploded view, so mapping windows to
 * them would leave them pointing at hidden geometry — the blades always stay
 * visible. The default rack has no such map (only 3 blob meshes) and is
 * unaffected. Names verified against the GLB; a wrong name yields no focus target.
 */
export const DATACENTER_PART_BY_COMP: Record<string, string> = {
  screen: 'SM_Server_6_001_StingrayPBS2_0', // front blade ≈ display
  status: 'SM_Server_7_001_StingrayPBS2_0', // blade ≈ status
  drives: 'SM_Servers_1_001_StingrayPBS3_0', // blade ≈ drive bay
  net: 'SM_Servers_3_001_StingrayPBS3_0', // blade ≈ network ports
  fan: 'SM_Servers_5_001_StingrayPBS3_0', // rear blade ≈ cooling fans
  power: 'SM_Server_8_001_StingrayPBS2_0', // blade ≈ power unit
};

/**
 * Data-center structural meshes hidden while the rack is EXPLODED (localhost-2
 * demo): the outer case shell, front door, door glass, and back panel — so the
 * exploded view shows only the bare, fanned-out server blades. They reappear
 * when the view collapses back. Names verified against the GLB.
 */
export const DATACENTER_HIDE_ON_EXPLODE: readonly string[] = [
  'SM_Server_Case_001_StingrayPBS4_0', // outer case shell
  'SM_Server_Case_Door_001_StingrayPBS4_0', // front door
  'SM_Server_Case_Door_glass_001_StingrayPBS5_0', // door glass
  'SM_Back_001_StingrayPBS2_0', // back panel
];
