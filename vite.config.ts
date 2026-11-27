import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';

function productionCspPlugin(): Plugin {
  return {
    name: 'production-csp-meta',
    apply: 'build',
    transformIndexHtml(html) {
      const cspMeta =
        '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'self\'; style-src \'self\'; img-src \'self\' data: blob:; font-src \'self\'; connect-src \'none\'; worker-src \'none\'; object-src \'none\'; base-uri \'self\'; form-action \'none\';" />';
      return html.replace('<!-- PRODUCTION_CSP -->', cspMeta);
    },
  };
}

export default defineConfig({
  plugins: [react(), productionCspPlugin()],
  preview: {
    headers: {
      'Content-Security-Policy':
        "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none';",
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'X-Frame-Options': 'DENY',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
