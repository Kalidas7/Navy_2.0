/**
 * Design tokens — single source of truth for the Naval Server Console theme.
 *
 * Values are lifted verbatim from the design handoff (README "Design Tokens"
 * and the per-component inline values in the prototype). The aesthetic is
 * deliberately hard-edged: square corners everywhere except status dots,
 * the radar scope, and the small port squares.
 */

export const colors = {
  // Surfaces
  baseBg: '#f5f6f8', // page background (--bg)
  panelBg: '#ffffff', // cards, bars, panels (--panel)
  cardGradient: 'linear-gradient(160deg,#ffffff,#ffffff)',
  cardGradientRow: 'linear-gradient(120deg,#ffffff,#ffffff)',
  iconTileGradient: 'linear-gradient(160deg,#f4f6f8,#eef1f5)', // inset tile (--chip)

  // Accents / status
  accent: '#2563eb', // primary accent, ONLINE/nominal, CPU, selection, links, charts
  blue: '#2563eb', // memory, ingress
  navy: '#2563eb', // bars, grid lines
  navyDeep: '#1e4fc4',
  amber: '#d97706', // warnings, temp, power draw
  red: '#dc2626', // critical
  standby: '#64748b', // standby / down

  // Text
  textHi: '#1a1f26', // headings, code (--tx)
  textBody: '#1a1f26', // default / neutral metrics
  textMid: '#4b5563', // (--tx2)
  textMid2: '#6b7280', // (--mut)
  textMuted: '#6b7280', // (--mut)
  textMuted2: '#9aa3af', // faint text / micro-labels (--mut2)

  // Borders
  borderCard: '#e2e5ea', // (--bd)
  borderChrome: '#e2e5ea',
  borderInput: '#e2e5ea',
  borderInner: '#e2e5ea',
  borderIcon: '#d5dae1', // (--bd2)

  // Misc
  bracketGreen: '#d5dae1', // corner brackets removed for light theme; neutral fallback
  alertText: '#d97706',

  // Flag chip
  flagSaffron: '#FF9933',
  flagWhite: '#f4f4f4',
  flagGreen: '#138808',
} as const;

/** Per-status colour set used by pills, dots, accent bars. */
export interface StatusMeta {
  color: string;
  label: string;
  bd: string;
  bg: string;
}

export const STATUS_META: Record<string, StatusMeta> = {
  online: { color: '#16a34a', label: 'ONLINE', bd: 'rgba(22,163,74,.35)', bg: 'rgba(22,163,74,.12)' },
  warn: { color: '#d97706', label: 'WARNING', bd: 'rgba(217,119,6,.35)', bg: 'rgba(217,119,6,.12)' },
  crit: { color: '#dc2626', label: 'CRITICAL', bd: 'rgba(220,38,38,.35)', bg: 'rgba(220,38,38,.12)' },
  standby: { color: '#64748b', label: 'STANDBY', bd: 'rgba(100,116,139,.35)', bg: 'rgba(100,116,139,.12)' },
};

export function statusMeta(status: string): StatusMeta {
  return (
    STATUS_META[status] ?? {
      color: '#64748b',
      label: '—',
      bd: 'rgba(100,116,139,.35)',
      bg: 'rgba(100,116,139,.12)',
    }
  );
}

/** Component sub-state colours (ok/warn/crit/standby). */
export function compColor(state: string): string {
  return (
    ({ ok: colors.accent, warn: colors.amber, crit: colors.red, standby: colors.standby } as Record<
      string,
      string
    >)[state] ?? colors.accent
  );
}

export function compStateLabel(state: string): string {
  return (
    (
      {
        ok: 'NOMINAL',
        warn: 'ELEVATED',
        crit: 'CRITICAL ALERT',
        standby: 'STANDBY',
      } as Record<string, string>
    )[state] ?? 'NOMINAL'
  );
}

export const fonts = {
  body: "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif",
  cond: "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif",
  mono: 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
} as const;

/**
 * Corner-radius scale (light-theme redesign, from the handoff):
 * 6px chips/small buttons · 8px buttons/tiles/rows/inputs · 10px cards ·
 * 12px floating toolbar + side panel · 999px pills.
 */
export const radii = {
  sm: 6,
  md: 8,
  card: 10,
  panel: 12,
  pill: 999,
} as const;

/**
 * Elevation scale (handoff): resting card shadow, hover lift, floating toolbar,
 * and side panel. Applied to surfaces that float over the page/scene.
 */
export const shadows = {
  card: '0 1px 2px rgba(16,24,40,.05)',
  cardHover: '0 8px 20px rgba(16,24,40,.10)',
  toolbar: '0 4px 16px rgba(16,24,40,.08)',
  panel: '0 8px 28px rgba(16,24,40,.12)',
} as const;

/** Active/inactive toggle styling shared by filter chips, tabs, view buttons. */
export function toggleStyles(active: boolean, accent: string = colors.accent) {
  return active
    ? { bg: 'rgba(37,99,235,.10)', fg: accent, bd: accent }
    : { bg: colors.panelBg, fg: colors.textMid, bd: colors.borderInput };
}
