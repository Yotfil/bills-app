import { describe, it } from 'vitest';

// CATÁLOGO DE TESTS (CLAUDE.md §5.11) — Tasa de cambio USD→COP (informativa, con caché).

describe('Tasa de cambio USD→COP', () => {
  it.todo('obtiene la tasa desde Frankfurter (fuente primaria)');
  it.todo('si Frankfurter falla, usa ExchangeRate-API (fallback)');
  it.todo('cachea el resultado con su fecha y NO vuelve a pedir el mismo día');
  it.todo('si no hay conexión, degrada con gracia mostrando la última tasa cacheada');
  it.todo('la fuente está detrás de una interfaz para poder cambiarla sin tocar la UI');
});
