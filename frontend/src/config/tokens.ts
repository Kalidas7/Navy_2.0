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
  baseBg: '#06090b',
  panelBg: '#0a1318',
  cardGradient: 'linear-gradient(160deg,#0b141a,#091016)',
  cardGradientRow: 'linear-gradient(120deg,#0b141a,#091016)',
  iconTileGradient: 'linear-gradient(160deg,#0d1a22,#0a1318)',

  // Accents / status
  accent: '#2bf0a0', // primary accent, ONLINE/nominal, CPU
  blue: '#37c2ff', // memory, ingress
  navy: '#2f7fc4', // bars, grid lines
  navyDeep: '#1c5a8a',
  amber: '#ffb84d', // warnings, temp, power draw
  red: '#ff5a5a', // critical
  standby: '#5b86a8', // standby / down

  // Text
  textHi: '#eafff5', // headings, code
  textBody: '#cfe7dd', // default / neutral metrics
  textMid: '#9fc4b6',
  textMid2: '#7c9a90',
  textMuted: '#5d7a74',
  textMuted2: '#46645c',

  // Borders
  borderCard: '#16282f',
  borderChrome: '#14242c',
  borderInput: '#1c2f38',
  borderInner: '#15262e',
  borderIcon: '#27424f',

  // Misc
  bracketGreen: '#1f4a3a',
  alertText: '#ff9a6a',

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
  online: { color: '#2bf0a0', label: 'ONLINE', bd: '#15402e', bg: 'rgba(11,30,22,.55)' },
  warn: { color: '#ffb84d', label: 'WARNING', bd: '#3a2c12', bg: 'rgba(30,22,8,.55)' },
  crit: { color: '#ff5a5a', label: 'CRITICAL', bd: '#3a1414', bg: 'rgba(30,10,10,.55)' },
  standby: { color: '#5b86a8', label: 'STANDBY', bd: '#1c3242', bg: 'rgba(12,24,34,.55)' },
};

export function statusMeta(status: string): StatusMeta {
  return (
    STATUS_META[status] ?? { color: '#5b86a8', label: '—', bd: '#1c3242', bg: 'rgba(12,24,34,.5)' }
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
  body: "'Saira',system-ui,sans-serif",
  cond: "'Saira Condensed',sans-serif",
  mono: "'JetBrains Mono',monospace",
} as const;

/** Active/inactive toggle styling shared by filter chips, tabs, view buttons. */
export function toggleStyles(active: boolean, accent: string = colors.accent) {
  return active
    ? { bg: 'rgba(43,240,160,.12)', fg: accent, bd: accent }
    : { bg: 'transparent', fg: '#6f8a82', bd: colors.borderInput };
}
