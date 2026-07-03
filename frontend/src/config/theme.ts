/**
 * Tweakable theming config (the prototype's "Tweaks").
 * Treat these as the configurable surface of the design.
 */
import { colors } from './tokens';

export interface ThemeConfig {
  /** primary accent — options: #2bf0a0 / #37c2ff / #ffb84d */
  accent: string;
  /** secondary navy */
  navyTint: string;
  /** show/hide 3D hotspot text labels */
  hotspotLabels: boolean;
  /** initial auto-rotate state */
  autoRotateDefault: boolean;
}

export const defaultTheme: ThemeConfig = {
  accent: colors.accent,
  navyTint: colors.navy,
  hotspotLabels: true,
  autoRotateDefault: true,
};
