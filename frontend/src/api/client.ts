/**
 * Backend API client.
 *
 * A thin, typed wrapper over `fetch` — the single place the frontend talks to
 * the Django backend. Base URL comes from the environment (VITE_API_BASE_URL),
 * defaulting to "/api" which the Vite dev proxy (and a prod reverse proxy)
 * forwards to Django. Swapping backends or environments is a config change here,
 * not a change scattered across components.
 */
import type { Server, CompData, LogEntry } from '@/types';
import { IS_WEB_DEMO } from '@/config/dataMode';
import { simFleet, simComponents, simLogs } from '@/api/simulator';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { Accept: 'application/json' },
      signal,
    });
  } catch (err) {
    // Network error / backend down / CORS.
    throw new ApiError(`Network error calling ${path}: ${(err as Error).message}`);
  }
  if (!res.ok) {
    throw new ApiError(`GET ${path} failed with ${res.status}`, res.status);
  }
  return (await res.json()) as T;
}

export const api = {
  /** GET /api/fleet — the full fleet of racks. (web-demo: simulated) */
  fleet: (signal?: AbortSignal) =>
    IS_WEB_DEMO ? Promise.resolve(simFleet()) : getJson<Server[]>('/fleet', signal),

  /** GET /api/racks/:id/components — drive bays, fans, ports, PSU, sonar, … (web-demo: simulated) */
  components: (id: string, signal?: AbortSignal) =>
    IS_WEB_DEMO
      ? Promise.resolve(simComponents())
      : getJson<CompData>(`/racks/${encodeURIComponent(id)}/components`, signal),

  /** GET /api/racks/:id/logs — mission/system log backlog. (web-demo: simulated) */
  logs: (id: string, signal?: AbortSignal) =>
    IS_WEB_DEMO
      ? Promise.resolve(simLogs())
      : getJson<LogEntry[]>(`/racks/${encodeURIComponent(id)}/logs`, signal),
};
