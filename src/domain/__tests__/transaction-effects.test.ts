import { describe, it, expect } from 'vitest';
import { transactionDelta } from '../ledger';
import { cardAvailableCredit, disponibleReal, loanProgress } from '../derived';
import { accountRef, cardRef, loanRef, makeAccount, makeCard, makeLoan, makeTxn } from './fixtures';

// CLAUDE.md §12.1 — Efectos de cada tipo de transacción sobre saldos. Reglas: §4, §5.3-§5.6.

describe('Efectos de transacciones sobre saldos', () => {
  describe('expense (gasto)', () => {
    it('con cuenta → baja cachedBalance de la cuenta en exactamente amount', () => {
      const delta = transactionDelta(
        makeTxn({ type: 'expense', amount: 50_000, source: accountRef('acc-1') }),
      );
      expect(delta.accounts['acc-1']).toBe(-50_000);
    });

    it('con tarjeta → sube cachedDebt de la tarjeta; NO toca ninguna cuenta', () => {
      const delta = transactionDelta(
        makeTxn({ type: 'expense', amount: 50_000, source: cardRef('card-1') }),
      );
      expect(delta.cards['card-1']).toBe(50_000);
      expect(Object.keys(delta.accounts)).toHaveLength(0);
    });

    it('con tarjeta → baja el cupo disponible (creditLimit - cachedDebt)', () => {
      const card = makeCard({ creditLimit: 1_000_000, cachedDebt: 0 });
      const after = makeCard({ creditLimit: 1_000_000, cachedDebt: card.cachedDebt + 50_000 });
      expect(cardAvailableCredit(after)).toBe(cardAvailableCredit(card) - 50_000);
    });
  });

  describe('income (ingreso)', () => {
    it('→ sube cachedBalance de la cuenta destino en amount', () => {
      const delta = transactionDelta(
        makeTxn({
          type: 'income',
          amount: 200_000,
          source: null,
          destination: accountRef('acc-2'),
          categoryId: null,
        }),
      );
      expect(delta.accounts['acc-2']).toBe(200_000);
    });
  });

  describe('transfer (transferencia entre cuentas propias)', () => {
    it('→ baja la cuenta origen y sube la destino por el mismo monto (neto cero)', () => {
      const delta = transactionDelta(
        makeTxn({
          type: 'transfer',
          amount: 100_000,
          source: accountRef('acc-1'),
          destination: accountRef('acc-2'),
          categoryId: null,
        }),
      );
      expect(delta.accounts['acc-1']).toBe(-100_000);
      expect(delta.accounts['acc-2']).toBe(100_000);
      const net = Object.values(delta.accounts).reduce((a, b) => a + b, 0);
      expect(net).toBe(0);
    });
  });

  describe('debt_payment (abono a deuda)', () => {
    it('a tarjeta → baja la cuenta origen y baja la deuda de la tarjeta', () => {
      const delta = transactionDelta(
        makeTxn({
          type: 'debt_payment',
          amount: 300_000,
          source: accountRef('acc-1'),
          destination: cardRef('card-1'),
          categoryId: null,
        }),
      );
      expect(delta.accounts['acc-1']).toBe(-300_000);
      expect(delta.cards['card-1']).toBe(-300_000);
    });

    it('a crédito → baja la cuenta origen y baja el cachedBalance del crédito; recalcula progreso', () => {
      const loan = makeLoan({ originalAmount: 10_000_000, cachedBalance: 10_000_000 });
      const delta = transactionDelta(
        makeTxn({
          type: 'debt_payment',
          amount: 1_000_000,
          source: accountRef('acc-1'),
          destination: loanRef('loan-1'),
          categoryId: null,
        }),
      );
      expect(delta.accounts['acc-1']).toBe(-1_000_000);
      expect(delta.loans['loan-1']).toBe(-1_000_000);
      const after = makeLoan({
        ...loan,
        cachedBalance: loan.cachedBalance + delta.loans['loan-1']!,
      });
      expect(loanProgress(after)).toBeCloseTo(0.1, 5);
    });
  });

  describe('Número-héroe: Disponible real', () => {
    it('= Σ(saldos de cuentas) − Σ(reservado)', () => {
      const accounts = [
        makeAccount({ id: 'acc-1', cachedBalance: 1_000_000 }),
        makeAccount({ id: 'acc-2', cachedBalance: 500_000 }),
      ];
      // Sin fijos destinados, reservado = 0 → disponible real = suma de saldos.
      expect(disponibleReal(accounts, [])).toBe(1_500_000);
    });
  });
});
