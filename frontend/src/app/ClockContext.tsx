/**
 * ClockContext — an isolated 1-second wall clock.
 *
 * The clock string updates every second. If it lived in the main AppContext
 * reducer, each tick would produce a new AppState, invalidate the AppContext
 * value memo, and re-render EVERY `useApp()` consumer once per second — exactly
 * the 1 Hz re-render treadmill AppContext is otherwise careful to avoid (SSE
 * frames are deliberately kept out of it for the same reason).
 *
 * Isolating the clock in its own tiny context means only components that call
 * `useClock()` (just the TopBar) re-render on each tick. Everything else under
 * AppProvider is untouched by the clock.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { fmtClock } from '@/lib/clock';

const ClockContext = createContext<string>('');

export function ClockProvider({ children }: { children: ReactNode }) {
  const [clock, setClock] = useState<string>(() => fmtClock());

  useEffect(() => {
    const id = setInterval(() => setClock(fmtClock()), 1000);
    return () => clearInterval(id);
  }, []);

  return <ClockContext.Provider value={clock}>{children}</ClockContext.Provider>;
}

/** The current wall-clock string (HH:MM:SS …). Updates once per second. */
// eslint-disable-next-line react-refresh/only-export-components
export function useClock(): string {
  return useContext(ClockContext);
}
