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
  build: {
    // Firebase (auth+firestore) es ~650 kB y se carga una vez al entrar (login/datos) y cachea; es el
    // único chunk grande inevitable. Subimos el umbral del aviso para no ensuciar el build con un warning
    // esperado (el resto ya quedó separado/lazy y el chunk inicial es ~115 kB).
    chunkSizeWarningLimit: 700,
    // Code-splitting de vendors: separa las libs grandes en chunks propios para mejor caché
    // (cambian poco) y para romper el monolito. Firebase es la más pesada; recharts (+ sus deps
    // d3) y el vendor de React/Router también van aparte. Las pantallas secundarias se cargan
    // lazy desde App.tsx, así que el chunk inicial queda chico.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@firebase') || id.includes('/firebase/')) return 'firebase';
          if (id.includes('/recharts/') || id.includes('/d3-') || id.includes('/victory'))
            return 'recharts';
          if (
            id.includes('/react-router') ||
            id.includes('/react-dom/') ||
            id.includes('/react/') ||
            id.includes('/scheduler/')
          )
            return 'vendor-react';
          return undefined;
        },
      },
    },
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
