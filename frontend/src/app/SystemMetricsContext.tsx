/**
 * Single source of truth for the real host-machine ("localhost" rack) metrics.
 *
 * ONE SSE subscription for the whole app lives here. Both the dashboard card
 * (RackCard) and the detail view (DetailView) read from this context, so they
 * always show identical, real-time values — no second connection, no divergent
 * ring-buffer histories.
 *
 * The derivation logic (raw snapshot → ring buffers → GraphValues) is shared
 * from `useSystemMetricsSource`; this file only owns the provider/consumer glue.
 */
import { createContext, useContext, type ReactNode } from 'react';
import { useSystemMetricsSource, type LiveMetrics } from '@/hooks/useSystemMetricsSource';

const SystemMetricsContext = createContext<LiveMetrics | null>(null);

export function SystemMetricsProvider({ children }: { children: ReactNode }) {
  // The single subscription. Opened once, lives for the app's lifetime.
  const value = useSystemMetricsSource();
  return <SystemMetricsContext.Provider value={value}>{children}</SystemMetricsContext.Provider>;
}

/**
 * Read the shared live host metrics. Must be used under SystemMetricsProvider.
 * Returns the latest raw snapshot, connection status, and derived GraphValues.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useSystemMetrics(): LiveMetrics {
  const ctx = useContext(SystemMetricsContext);
  if (!ctx) throw new Error('useSystemMetrics must be used within a SystemMetricsProvider');
  return ctx;
}
