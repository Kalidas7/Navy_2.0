/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL for backend API calls. Defaults to "/api" (proxied in dev). */
  readonly VITE_API_BASE_URL?: string;
  /** Dev-only: where the Vite proxy forwards /api. Read by vite.config.ts. */
  readonly VITE_API_PROXY_TARGET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
