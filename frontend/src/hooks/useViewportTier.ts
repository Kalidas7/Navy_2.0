/**
 * Which viewport tier the app is rendering at.
 *
 * Backed by `matchMedia` through `useSyncExternalStore` rather than a `resize`
 * listener + `useState`: the browser only notifies us when a breakpoint is
 * actually crossed (not on every pixel of a drag), and React reads the snapshot
 * during render, so the first paint is already correct — no desktop-then-mobile
 * flash on load.
 *
 * `getSnapshot` returns a plain string, so it is referentially stable across
 * calls and cannot loop.
 */
import { useSyncExternalStore } from 'react';
import { MQ_BELOW_DESKTOP, MQ_PHONE, type ViewportTier } from '@/config/breakpoints';

function subscribe(onChange: () => void): () => void {
  const lists = [window.matchMedia(MQ_PHONE), window.matchMedia(MQ_BELOW_DESKTOP)];
  lists.forEach((l) => l.addEventListener('change', onChange));
  return () => lists.forEach((l) => l.removeEventListener('change', onChange));
}

function getSnapshot(): ViewportTier {
  if (window.matchMedia(MQ_PHONE).matches) return 'phone';
  if (window.matchMedia(MQ_BELOW_DESKTOP).matches) return 'tablet';
  return 'desktop';
}

/** No window (SSR / prerender): assume desktop so the mobile chunk is never pulled. */
function getServerSnapshot(): ViewportTier {
  return 'desktop';
}

/** `'phone' | 'tablet' | 'desktop'`, updated when a breakpoint is crossed. */
export function useViewportTier(): ViewportTier {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** True on phone and tablet — i.e. the mobile tree should render. */
export function useIsMobile(): boolean {
  return useViewportTier() !== 'desktop';
}
