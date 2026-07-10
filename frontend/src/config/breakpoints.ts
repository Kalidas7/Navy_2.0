/**
 * Viewport tiers for the mobile port.
 *
 * The desktop layout has no fluid fallback: `.rk-app` is `overflow:hidden` and
 * the detail screen is built from fixed-offset absolute chrome around a 360px
 * side dock. Measured floor is ~960px (a roster `RackRow` has a 628px hard
 * minimum beside the 230px sidebar), so anything narrower silently CLIPS rather
 * than reflowing.
 *
 * We therefore hand narrow viewports to a separate, purpose-built tree instead
 * of trying to squeeze the desktop one:
 *
 *   phone    ≤ 767px   card list only (a roster row cannot fit)
 *   tablet   768–1023px mobile tree, widened; roster rows fit again
 *   desktop  ≥ 1024px  the existing layout, untouched
 *
 * 1024 (not 960) is the desktop cut-off: it clears the measured floor with room
 * to spare and lands on the conventional `lg` boundary, so an iPad in landscape
 * gets the real desktop console.
 */

/** Widest phone viewport. Above this, a roster row (628px min) starts to fit. */
export const PHONE_MAX = 767;

/** Widest non-desktop viewport. Above this, the desktop layout is safe. */
export const TABLET_MAX = 1023;

export type ViewportTier = 'phone' | 'tablet' | 'desktop';

/** `matchMedia` query matching the phone tier. */
export const MQ_PHONE = `(max-width: ${PHONE_MAX}px)`;

/** `matchMedia` query matching phone OR tablet — i.e. "not desktop". */
export const MQ_BELOW_DESKTOP = `(max-width: ${TABLET_MAX}px)`;
