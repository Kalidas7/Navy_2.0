/** View-model helpers for the detail view's subsystem components. */
import { COMPS } from '@/config/components';
import { compColor, compStateLabel, colors } from '@/config/tokens';
import type { CompKey, CompStates } from '@/types';

export interface CompButtonVM {
  key: CompKey;
  label: string;
  glyph: string;
  color: string;
  selected: boolean;
}

export function selectCompButtons(
  compStates: CompStates,
  selected: CompKey | null,
): CompButtonVM[] {
  return COMPS.map((c) => {
    const st = compStates[c.key] ?? 'ok';
    return {
      key: c.key,
      label: c.label,
      glyph: c.glyph,
      color: compColor(st),
      selected: selected === c.key,
    };
  });
}

export interface ActiveCompVM {
  label: string;
  glyph: string;
  color: string;
  stateLabel: string;
  tint: string;
}

export function selectActiveComp(
  compStates: CompStates,
  selected: CompKey | null,
): ActiveCompVM {
  const def = COMPS.find((c) => c.key === selected);
  if (!def) {
    return { label: '', glyph: '', color: colors.accent, stateLabel: '', tint: 'transparent' };
  }
  const st = compStates[def.key] ?? 'ok';
  const rgb = st === 'crit' ? '255,90,90' : st === 'warn' ? '255,184,77' : '43,240,160';
  return {
    label: def.label,
    glyph: def.glyph,
    color: compColor(st),
    stateLabel: compStateLabel(st),
    tint: `rgba(${rgb},.07)`,
  };
}
