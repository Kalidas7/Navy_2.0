/**
 * Central route definitions. Keeping URL shapes in one place makes it trivial
 * to add pages later (e.g. /server/:id/logs) without hunting string literals.
 */
export const routes = {
  fleet: '/',
  /** Route pattern used by <Route path=...>. */
  serverDetailPattern: '/server/:id',
  /** Build a concrete detail URL for a given server id. */
  serverDetail: (id: string) => `/server/${encodeURIComponent(id)}`,
} as const;
