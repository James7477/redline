import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Extra hostnames allowed to reach the dev server, comma separated.
 * Supplied per-process (VITE_ALLOWED_HOSTS) so no VM hostname is baked into
 * the repo. Empty means Vite's default same-host-only policy.
 */
const env =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const allowedHosts = (env.VITE_ALLOWED_HOSTS ?? '')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean);

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    strictPort: true,
    allowedHosts,
  },
});
