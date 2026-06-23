import { describe, it } from 'vitest';

// CATÁLOGO DE TESTS (CLAUDE.md §12.1 + §11) — Validación por tipo de transacción.
// Una transacción inválida NO se debe poder guardar.

describe('Validación de transacciones (§11)', () => {
  describe('regla común', () => {
    it.todo('rechaza amount <= 0 en cualquier tipo');
    it.todo('rechaza amount no entero (los pesos se guardan como entero)');
    it.todo('exige amount > 0 (siempre positivo; el signo lo decide el tipo, no el dato)');
  });

  describe('expense', () => {
    it.todo('acepta source = cuenta O tarjeta');
    it.todo('exige categoryId (requerido)');
    it.todo('rechaza expense sin categoría');
    it.todo('exige destination = null y adjustmentDirection = null');
  });

  describe('income', () => {
    it.todo('exige destination = cuenta y source = null');
    it.todo('permite categoryId opcional');
  });

  describe('transfer', () => {
    it.todo('exige source = cuenta y destination = cuenta distinta');
    it.todo('rechaza transfer con origen = destino');
    it.todo('no cuenta con categoría de gasto');
  });

  describe('debt_payment', () => {
    it.todo('exige source = cuenta y destination = tarjeta O crédito');
    it.todo('no cuenta con categoría de gasto');
  });

  describe('adjustment', () => {
    it.todo('exige source = cuenta y categoryId = categoría de sistema "Ajuste"');
    it.todo('exige adjustmentDirection ∈ {increase, decrease}');
  });
});
