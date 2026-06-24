import { describe, it, expect } from 'vitest';
import { buildManualTransactionDraft } from '../transactionDraft';
import { validateTransaction } from '../validation';
import { accountRef, cardRef, STUB_TS } from './fixtures';

// El borrador construido desde el formulario debe pasar la validación (§11) para cada tipo.

describe('buildManualTransactionDraft', () => {
  it('expense: conserva categoría y origen, sin destino', () => {
    const draft = buildManualTransactionDraft({
      type: 'expense',
      amount: 30_000,
      date: STUB_TS,
      concept: 'Café',
      categoryId: 'cat-comidas',
      source: accountRef('acc-1'),
      destination: null,
    });
    expect(draft.type).toBe('expense');
    expect(draft.destination).toBeNull();
    expect(validateTransaction(draft)).toEqual([]);
  });

  it('expense con hormiga agrega la etiqueta', () => {
    const draft = buildManualTransactionDraft({
      type: 'expense',
      amount: 8_000,
      date: STUB_TS,
      concept: 'Antojo',
      categoryId: 'cat-comidas',
      source: accountRef('acc-1'),
      destination: null,
      hormiga: true,
    });
    expect(draft.tags).toContain('hormiga');
  });

  it('income: destino cuenta, sin origen ni categoría', () => {
    const draft = buildManualTransactionDraft({
      type: 'income',
      amount: 500_000,
      date: STUB_TS,
      concept: 'Sueldo',
      categoryId: null,
      source: null,
      destination: accountRef('acc-1'),
    });
    expect(draft.source).toBeNull();
    expect(draft.categoryId).toBeNull();
    expect(validateTransaction(draft)).toEqual([]);
  });

  it('transfer: origen y destino cuentas, sin categoría', () => {
    const draft = buildManualTransactionDraft({
      type: 'transfer',
      amount: 100_000,
      date: STUB_TS,
      concept: 'Paso a efectivo',
      categoryId: null,
      source: accountRef('acc-1'),
      destination: accountRef('acc-2'),
    });
    expect(validateTransaction(draft)).toEqual([]);
  });

  it('debt_payment: origen cuenta, destino tarjeta, sin categoría', () => {
    const draft = buildManualTransactionDraft({
      type: 'debt_payment',
      amount: 350_000,
      date: STUB_TS,
      concept: 'Abono TC',
      categoryId: null,
      source: accountRef('acc-1'),
      destination: cardRef('card-1'),
    });
    expect(draft.type).toBe('debt_payment');
    expect(validateTransaction(draft)).toEqual([]);
  });

  it('la etiqueta hormiga NO se agrega en tipos que no son gasto', () => {
    const draft = buildManualTransactionDraft({
      type: 'transfer',
      amount: 100_000,
      date: STUB_TS,
      concept: 'x',
      categoryId: null,
      source: accountRef('acc-1'),
      destination: accountRef('acc-2'),
      hormiga: true,
    });
    expect(draft.tags).not.toContain('hormiga');
  });
});
