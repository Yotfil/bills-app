/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
