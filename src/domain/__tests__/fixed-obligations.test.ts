import { describe, it } from 'vitest';

// CATÁLOGO DE TESTS (CLAUDE.md §12.1) — Obligaciones fijas y sus TRES estados.
// Reglas: CLAUDE.md §5.2 (estados y efecto sobre el dinero) y §5.3 (conexión fijo→registro).

describe('Obligaciones fijas: transiciones de estado', () => {
  describe('pending → allocated (destinar)', () => {
    it.todo('NO cambia el cachedBalance de la cuenta (la plata no se ha movido)');
    it.todo('sube el reservado de la cuenta asignada en el monto del fijo');
    it.todo('baja el disponible de la cuenta y el disponible real (número-héroe)');
  });

  describe('allocated → paid (pagar lo destinado)', () => {
    it.todo('crea automáticamente la transacción en el registro (§5.3)');
    it.todo('baja el cachedBalance de la cuenta');
    it.todo('libera el reservado de la cuenta (lo quita)');
    it.todo('el disponible real NO cambia (ya estaba contado: pasa de comprometido a gastado)');
    it.todo('enlaza la transacción creada con el fijo (transactionId / fixedMonthlyId)');
  });

  describe('pending → paid (directo, sin destinar)', () => {
    it.todo('crea la transacción y baja el saldo total');
    it.todo('no hay reservado previo que liberar');
  });

  describe('monto al pagar', () => {
    it.todo('se prellena con budgetedAmount pero es editable antes de confirmar (§5.3)');
    it.todo('si se edita a un valor distinto del presupuestado, se guarda el monto real');
  });

  describe('fijo que es abono a deuda (payKind = debt_payment)', () => {
    it.todo('al pagar genera una transacción de tipo debt_payment, no expense (§5.3)');
    it.todo('baja la deuda de la tarjeta/crédito destino (debtTargetId)');
  });
});
