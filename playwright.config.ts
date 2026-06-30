import { defineConfig, devices } from '@playwright/test';

// E2E de flujos críticos (CLAUDE.md §12.2). Los tests viven en /e2e y corren contra el
// Firebase Emulator Suite (Auth + Firestore), no contra el Firebase real: así son
// deterministas y no tocan datos de producción. El emulador arranca limpio en cada corrida.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // El emulador + el dev server son un backend COMPARTIDO entre los tests. Con mucha
  // concurrencia, su latencia puede hacer que la app parpadee a "Cargando…" y remonte la
  // pantalla a media interacción. Limitamos workers y damos un reintento para absorber ese
  // ruido sin sacrificar la rapidez (la suite corre en ~20s).
  workers: 2,
  retries: 2,
  // Espera a que AMBOS emuladores (Firestore 8080 + Auth 9099) estén listos antes de los tests:
  // evita el flaky de arranque en frío de auth.spec (el webServer solo espera a Firestore).
  globalSetup: './e2e/global-setup.ts',
  // Damos margen extra: la primera vez el emulador descarga su binario y arrancar Auth +
  // Firestore + Vite toma unos segundos.
  timeout: 30_000,
  reporter: 'html',
  use: {
    // Puerto dedicado (5174) para que el dev server de e2e (modo emulador) jamás se confunda
    // con un `npm run dev` normal en 5173 que apunta al Firebase real.
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Mobile-first: validamos también un viewport móvil (CLAUDE.md §3).
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  // Dos servidores: el Emulator Suite (Auth+Firestore) y el dev server de Vite apuntando
  // al emulador (VITE_USE_EMULATOR=1). Playwright espera a que ambos respondan antes de
  // correr los tests.
  webServer: [
    {
      command: 'npm run emulators',
      // El emulador de Firestore responde en su raíz cuando está listo.
      url: 'http://127.0.0.1:8080/',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'npm run dev:e2e',
      url: 'http://localhost:5174',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
