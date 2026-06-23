import { describe, it, expect } from 'vitest';
import { validateTransaction } from '../validation';
import { accountRef, cardRef, loanRef, makeTxn } from './fixtures';

// CLAUDE.md §12.1 + §11 — Validación por tipo de transacción.

describe('Validación de transacciones (§11)', () => {
  describe('regla común: amount', () => {
    it('rechaza amount <= 0', () => {
      expect(validateTransaction(makeTxn({ amount: 0 }))).toContain(
        'amount_must_be_positive_integer',
      );
      expect(validateTransaction(makeTxn({ amount: -10 }))).toContain(
        'amount_must_be_positive_integer',
      );
    });

    it('rechaza amount no entero', () => {
      expect(validateTransaction(makeTxn({ amount: 1500.5 }))).toContain(
        'amount_must_be_positive_integer',
      );
    });

    it('acepta amount entero positivo', () => {
      expect(validateTransaction(makeTxn({ amount: 1500 }))).not.toContain(
        'amount_must_be_positive_integer',
      );
    });
  });

  describe('expense', () => {
    it('acepta source = cuenta o tarjeta con categoría', () => {
      expect(validateTransaction(makeTxn({ type: 'expense', source: accountRef('a') }))).toEqual(
        [],
      );
      expect(validateTransaction(makeTxn({ type: 'expense', source: cardRef('c') }))).toEqual([]);
    });

    it('rechaza expense sin categoría', () => {
      expect(validateTransaction(makeTxn({ type: 'expense', categoryId: null }))).toContain(
        'expense_requires_category',
      );
    });

    it('rechaza expense con destination', () => {
      expect(
        validateTransaction(makeTxn({ type: 'expense', destination: accountRef('b') })),
      ).toContain('expense_forbids_destination');
    });
  });

  describe('income', () => {
    it('exige destination = cuenta y source = null', () => {
      expect(
        validateTransaction(
          makeTxn({ type: 'income', source: null, destination: accountRef('a'), categoryId: null }),
        ),
      ).toEqual([]);
    });

    it('rechaza income con source', () => {
      expect(
        validateTransaction(
          makeTxn({ type: 'income', source: accountRef('a'), destination: accountRef('b') }),
        ),
      ).toContain('income_forbids_source');
    });
  });

  describe('transfer', () => {
    it('acepta source y destino cuentas distintas', () => {
      expect(
        validateTransaction(
          makeTxn({
            type: 'transfer',
            source: accountRef('a'),
            destination: accountRef('b'),
            categoryId: null,
          }),
        ),
      ).toEqual([]);
    });

    it('rechaza transfer con origen = destino', () => {
      expect(
        validateTransaction(
          makeTxn({
            type: 'transfer',
            source: accountRef('a'),
            destination: accountRef('a'),
            categoryId: null,
          }),
        ),
      ).toContain('transfer_requires_distinct_account_destination');
    });
  });

  describe('debt_payment', () => {
    it('acepta source cuenta y destino tarjeta o crédito', () => {
      expect(
        validateTransaction(
          makeTxn({
            type: 'debt_payment',
            source: accountRef('a'),
            destination: cardRef('c'),
            categoryId: null,
          }),
        ),
      ).toEqual([]);
      expect(
        validateTransaction(
          makeTxn({
            type: 'debt_payment',
            source: accountRef('a'),
            destination: loanRef('l'),
            categoryId: null,
          }),
        ),
      ).toEqual([]);
    });

    it('rechaza destino cuenta', () => {
      expect(
        validateTransaction(
          makeTxn({
            type: 'debt_payment',
            source: accountRef('a'),
            destination: accountRef('b'),
            categoryId: null,
          }),
        ),
      ).toContain('debt_payment_requires_card_or_loan_destination');
    });
  });

  describe('adjustment', () => {
    it('acepta source cuenta, categoría y dirección', () => {
      expect(
        validateTransaction(
          makeTxn({
            type: 'adjustment',
            source: accountRef('a'),
            categoryId: 'cat-ajuste',
            adjustmentDirection: 'increase',
          }),
        ),
      ).toEqual([]);
    });

    it('rechaza adjustment sin dirección', () => {
      expect(
        validateTransaction(
          makeTxn({
            type: 'adjustment',
            source: accountRef('a'),
            categoryId: 'cat-ajuste',
            adjustmentDirection: null,
          }),
        ),
      ).toContain('adjustment_requires_direction');
    });
  });
});
