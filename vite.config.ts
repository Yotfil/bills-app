/// <reference types="vitest/config" />
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// --- Versionado de la app (inyectado en build) ---
// La versión semántica es manual (package.json), para marcar releases con sentido humano.
// El commit y la fecha son AUTOMÁTICOS en cada deploy: confirman de un vistazo qué build está
// en vivo (útil para saber si Netlify ya publicó la versión nueva). Sin pasos manuales.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

function resolveCommit(): string {
  // Netlify expone el commit del deploy en COMMIT_REF; en local lo sacamos de git.
  if (process.env.COMMIT_REF) return process.env.COMMIT_REF.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'dev';
  }
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_COMMIT__: JSON.stringify(resolveCommit()),
    __APP_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    tailwindcss(),
    // PWA (CLAUDE.md §3): instalable en móvil, pantalla completa y caché offline básico.
    // El service worker se autoactualiza; precachea el build para que la app abra sin señal.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Mis Luks',
        short_name: 'Mis Luks',
        description: 'Tus finanzas personales con mínima fricción.',
        lang: 'es-CO',
        theme_color: '#1a3c3b',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  test: {
    // Unit tests (lógica de dominio + componentes). Los e2e van por Playwright.
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    // Playwright maneja los e2e en /e2e; Vitest no debe tocarlos.
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
});
