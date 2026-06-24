import { Timestamp } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';
import { categoryHasMovements, entityHasMovements } from '../entityUsage';
import type { Transaction } from '../types';
import { accountRef, cardRef, makeTxn, STUB_TS } from './fixtures';

function txn(partial: Partial<Transaction> = {}): Transaction {
  return {
    ...makeTxn(),
    id: 'txn-1',
    createdAt: STUB_TS,
    updatedAt: STUB_TS,
    schemaVersion: 1,
    date: Timestamp.fromMillis(0),
    ...partial,
  };
}

describe('entityHasMovements', () => {
  it('detecta la entidad como origen', () => {
    const txns = [txn({ source: accountRef('acc-1'), destination: null })];
    expect(entityHasMovements(txns, 'account', 'acc-1')).toBe(true);
  });

  it('detecta la entidad como destino', () => {
    const txns = [
      txn({ type: 'transfer', source: accountRef('acc-9'), destination: accountRef('acc-1') }),
    ];
    expect(entityHasMovements(txns, 'account', 'acc-1')).toBe(true);
  });

  it('distingue el tipo de entidad (cuenta vs tarjeta con el mismo id)', () => {
    const txns = [txn({ source: cardRef('x1'), destination: null })];
    expect(entityHasMovements(txns, 'card', 'x1')).toBe(true);
    expect(entityHasMovements(txns, 'account', 'x1')).toBe(false);
  });

  it('false si ningún movimiento la referencia', () => {
    const txns = [txn({ source: accountRef('acc-1'), destination: null })];
    expect(entityHasMovements(txns, 'account', 'acc-2')).toBe(false);
    expect(entityHasMovements([], 'account', 'acc-1')).toBe(false);
  });
});

describe('categoryHasMovements', () => {
  it('true si algún movimiento usa la categoría', () => {
    const txns = [txn({ categoryId: 'cat-comidas' })];
    expect(categoryHasMovements(txns, 'cat-comidas')).toBe(true);
  });

  it('false si ninguno la usa', () => {
    const txns = [txn({ categoryId: 'cat-comidas' })];
    expect(categoryHasMovements(txns, 'cat-ocio')).toBe(false);
    expect(categoryHasMovements([], 'cat-comidas')).toBe(false);
  });
});
