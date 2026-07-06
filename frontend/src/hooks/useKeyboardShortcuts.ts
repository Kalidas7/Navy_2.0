/**
 * Global keyboard shortcuts, mounted once at the app root.
 *
 *  - "\"  (backslash)  → focus the search box, like Chrome's quick-find. Works
 *                        on both the home and detail screens (both top bars carry
 *                        a search input tagged data-search-input).
 *  - "Esc"              → step back through the Display-panel tabs: if a tab has
 *                        been changed, go back one step (pop the history stack);
 *                        when there's nothing left to go back to, close the panel.
 *                        Does nothing when no panel is open.
 *
 * Shortcuts are ignored while typing in an input/textarea/select (except Esc,
 * which blurs the field), so they never eat normal text entry.
 */
import { useEffect } from 'react';
import { useApp } from '@/app/AppContext';

function isTextEntry(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable;
}

export function useKeyboardShortcuts(): void {
  const { state, closeMenu, tabBack } = useApp();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // "\" focuses the search box (unless already typing somewhere).
      if (e.key === '\\' && !isTextEntry(e.target)) {
        const input = document.querySelector<HTMLInputElement>('[data-search-input]');
        if (input) {
          e.preventDefault();
          input.focus();
          input.select();
        }
        return;
      }

      if (e.key === 'Escape') {
        // While typing, Esc just drops focus (lets the field clear its own state).
        if (isTextEntry(e.target)) {
          (e.target as HTMLElement).blur();
          return;
        }
        // Panel open: step back one tab, or close it when nothing's left.
        if (state.selectedComp) {
          e.preventDefault();
          if (state.screenViewHistory.length > 0) {
            tabBack();
          } else {
            closeMenu();
          }
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.selectedComp, state.screenViewHistory.length, closeMenu, tabBack]);
}
