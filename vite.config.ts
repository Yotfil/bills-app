/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // PWA (CLAUDE.md §3): instalable en móvil, pantalla completa y caché offline básico.
    // El service worker se autoactualiza; precachea el build para que la app abra sin señal.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Finanzas',
        short_name: 'Finanzas',
        description: 'Tus finanzas personales con mínima fricción.',
        lang: 'es-CO',
        theme_color: '#0f172a',
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
