import { describe, it } from 'vitest';

// CATÁLOGO DE TESTS (CLAUDE.md §12.1) — Rollover mensual (§5.10).

describe('Rollover mensual', () => {
  it.todo('genera la instancia de fijos del nuevo mes desde la plantilla activa');
  it.todo('todos los fijos del nuevo mes nacen en estado pending');
  it.todo('toma snapshots (nombre, monto, categoría) que no cambian si la plantilla cambia luego');
  it.todo('los presupuestos por categoría se reinician al tope definido');
  it.todo('los saldos de cuentas, deudas y créditos se CONSERVAN (no se reinician)');
  it.todo('no duplica fijos si el rollover del mes ya se ejecutó');
});
