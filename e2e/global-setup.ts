// Setup global de Playwright (CLAUDE.md §12.2): espera a que el Emulator Suite esté REALMENTE listo
// antes de correr los tests. El `webServer` de Playwright solo espera a Firestore (8080); el emulador
// de **Auth (9099)** puede tardar un poco más en arrancar en frío, y `auth.spec.ts` lo golpea de una →
// flaky en la primera corrida. Aquí hacemos poll a AMBOS puertos hasta que respondan, eliminando esa
// carrera de arranque en frío.

const ENDPOINTS = [
  'http://127.0.0.1:8080/', // Firestore emulator (raíz responde "Ok")
  'http://127.0.0.1:9099/', // Auth emulator (raíz responde JSON con authEmulator.ready)
];

async function waitForEmulator(url: string, timeoutMs = 120_000): Promise<void> {
  const start = Date.now();
  let delay = 200;
  for (;;) {
    try {
      // Cualquier respuesta HTTP (incluso 404) significa que el puerto ya escucha = listo.
      await fetch(url);
      return;
    } catch {
      if (Date.now() - start > timeoutMs) {
        throw new Error(`El emulador no respondió a tiempo: ${url}`);
      }
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(Math.round(delay * 1.5), 2000);
    }
  }
}

export default async function globalSetup(): Promise<void> {
  await Promise.all(ENDPOINTS.map((u) => waitForEmulator(u)));
}
