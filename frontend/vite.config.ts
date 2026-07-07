import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    // Dev proxy: the browser calls same-origin `/api/...`, Vite forwards it to
    // the Django backend. Avoids CORS in dev and mirrors a production reverse
    // proxy. Override the target with VITE_API_PROXY_TARGET if Django runs
    // elsewhere.
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    // No public sourcemap in production builds: it shipped a ~3 MB .map exposing
    // the full original source. 'hidden' still emits maps for error-reporting
    // tools but omits the sourceMappingURL so browsers don't fetch/expose them.
    sourcemap: 'hidden',
  },
});
