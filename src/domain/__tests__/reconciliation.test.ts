import { describe, it } from 'vitest';

// CATÁLOGO DE TESTS (CLAUDE.md §12.1) — Reconciliación de cuentas (§5.7).
// Los saldos NO se editan a mano: corregir = crear un movimiento de ajuste por el desfase.

describe('Reconciliación de cuenta', () => {
  it.todo('saldo real MAYOR al registrado → crea ajuste increase por el desfase exacto');
  it.todo('saldo real MENOR al registrado → crea ajuste decrease por el desfase exacto');
  it.todo('el ajuste usa la categoría de sistema "Ajuste / Reconciliación"');
  it.todo('el ajuste NO contamina los reportes de gasto (includeInSpendReports = false)');
  it.todo('permite una nota corta opcional y la guarda en el movimiento');
  it.todo('tras reconciliar, el cachedBalance coincide con el saldo real indicado');
});
