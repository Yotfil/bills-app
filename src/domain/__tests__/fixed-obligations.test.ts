import { describe, it, expect } from 'vitest';
import { buildTransactionFromFixed, canTransition } from '../fixed';
import { accountReserved, disponibleReal } from '../derived';
import { transactionDelta } from '../ledger';
import { accountRef, cardRef, makeAccount, makeFixed, STUB_TS } from './fixtures';

// CLAUDE.md §12.1 — Obligaciones fijas: los TRES estados (§5.2) y conexión fijo→registro (§5.3).

describe('Obligaciones fijas: transiciones de estado', () => {
  describe('pending → allocated (destinar)', () => {
    it('sube el reservado de la cuenta asignada; baja el disponible real sin tocar el saldo', () => {
      const accounts = [makeAccount({ id: 'acc-1', cachedBalance: 1_000_000 })];
      const fixedAllocated = makeFixed({
        status: 'allocated',
        budgetedAmount: 230_000,
        paymentMethod: accountRef('acc-1'),
      });

      // Reservado pasa de 0 a 230.000; el cachedBalance NO cambia (la plata no se ha movido).
      expect(accountReserved([], 'acc-1')).toBe(0);
      expect(accountReserved([fixedAllocated], 'acc-1')).toBe(230_000);

      // Disponible real baja exactamente en el monto destinado.
      expect(disponibleReal(accounts, [])).toBe(1_000_000);
      expect(disponibleReal(accounts, [fixedAllocated])).toBe(770_000);
    });
  });

  describe('allocated → paid (pagar lo destinado)', () => {
    it('crea la transacción y, al aplicarla, baja el saldo y libera el reservado; disponible real igual', () => {
      const accounts = [makeAccount({ id: 'acc-1', cachedBalance: 1_000_000 })];
      const allocated = makeFixed({
        status: 'allocated',
        budgetedAmount: 230_000,
        paymentMethod: accountRef('acc-1'),
      });

      // Con el fijo destinado: saldo 1.000.000, reservado 230.000 → disponible real 770.000.
      expect(disponibleReal(accounts, [allocated])).toBe(770_000);

      // Al pagar se crea la transacción y el fijo deja de estar 'allocated' (reservado se libera).
      const txn = buildTransactionFromFixed(allocated, {
        amount: 230_000,
        date: STUB_TS,
        paymentMethod: accountRef('acc-1'),
      });
      const delta = transactionDelta(txn);
      const paidAccounts = [
        makeAccount({ id: 'acc-1', cachedBalance: 1_000_000 + delta.accounts['acc-1']! }),
      ];

      // Saldo bajó a 770.000; ya no hay reservado → disponible real sigue en 770.000.
      expect(paidAccounts[0]!.cachedBalance).toBe(770_000);
      expect(disponibleReal(paidAccounts, [])).toBe(770_000);
    });
  });

  describe('máquina de estados (§5.2)', () => {
    it('permite pending→allocated, allocated→paid y el atajo pending→paid', () => {
      expect(canTransition('pending', 'allocated')).toBe(true);
      expect(canTransition('allocated', 'paid')).toBe(true);
      expect(canTransition('pending', 'paid')).toBe(true);
    });

    it('no permite retroceder ni partir de paid', () => {
      expect(canTransition('allocated', 'pending')).toBe(false);
      expect(canTransition('paid', 'allocated')).toBe(false);
    });
  });

  describe('conexión fijo→registro (§5.3)', () => {
    it('prellena el monto con budgetedAmount pero respeta el real editado', () => {
      const fixed = makeFixed({ budgetedAmount: 230_000 });
      const real = buildTransactionFromFixed(fixed, {
        amount: 215_000,
        date: STUB_TS,
        paymentMethod: accountRef('acc-1'),
      });
      expect(real.amount).toBe(215_000); // se guarda el real, no el presupuestado
    });

    it('un fijo expense genera una transacción de tipo expense con su categoría', () => {
      const fixed = makeFixed({ payKind: 'expense', categoryId: 'cat-servicios' });
      const txn = buildTransactionFromFixed(fixed, {
        amount: 230_000,
        date: STUB_TS,
        paymentMethod: accountRef('acc-1'),
      });
      expect(txn.type).toBe('expense');
      expect(txn.categoryId).toBe('cat-servicios');
      expect(txn.fixedMonthlyId).toBe(fixed.id);
    });

    it('un fijo de abono (debt_payment) genera debt_payment hacia la deuda destino, sin categoría', () => {
      const fixed = makeFixed({
        payKind: 'debt_payment',
        categoryId: 'cat-x',
        debtTargetId: 'card-1',
      });
      const txn = buildTransactionFromFixed(fixed, {
        amount: 350_000,
        date: STUB_TS,
        paymentMethod: accountRef('acc-1'),
        debtTarget: cardRef('card-1'),
      });
      expect(txn.type).toBe('debt_payment');
      expect(txn.categoryId).toBeNull();
      expect(txn.destination).toEqual(cardRef('card-1'));
    });
  });
});
