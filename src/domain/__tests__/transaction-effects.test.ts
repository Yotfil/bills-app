import { describe, it } from 'vitest';

// CATÁLOGO DE TESTS (CLAUDE.md §12.1) — Efectos de cada tipo de transacción sobre saldos.
// Escrito ANTES de la lógica (TDD). Cada `it.todo` es un caso a satisfacer en el Paso 4
// (capa de dominio). Fuente de verdad de las reglas: CLAUDE.md §4, §5.3-§5.6.

describe('Efectos de transacciones sobre saldos', () => {
  describe('expense (gasto)', () => {
    it.todo('con cuenta → baja cachedBalance de la cuenta en exactamente amount');
    it.todo('con tarjeta → sube cachedDebt de la tarjeta; NO toca ninguna cuenta');
    it.todo('con tarjeta → baja el cupo disponible (creditLimit - cachedDebt)');
  });

  describe('income (ingreso)', () => {
    it.todo('→ sube cachedBalance de la cuenta destino en amount');
    it.todo('→ NO cuenta como gasto en reportes');
  });

  describe('transfer (transferencia entre cuentas propias)', () => {
    it.todo('→ baja la cuenta origen y sube la destino por el mismo monto');
    it.todo('→ efecto neto sobre la suma de saldos = cero');
    it.todo('→ NO cuenta como gasto');
  });

  describe('debt_payment (abono a deuda)', () => {
    it.todo('a tarjeta → baja la cuenta origen y baja la deuda de la tarjeta');
    it.todo('a tarjeta → libera cupo disponible por el monto abonado');
    it.todo('a crédito → baja la cuenta origen y baja el cachedBalance del crédito');
    it.todo('a crédito → recalcula el progreso = 1 - (cachedBalance / originalAmount)');
    it.todo('→ NO cuenta como gasto');
  });

  describe('Número-héroe: Disponible real', () => {
    it.todo('= Σ(saldos de cuentas) − Σ(reservado) (CLAUDE.md §4)');
  });
});
