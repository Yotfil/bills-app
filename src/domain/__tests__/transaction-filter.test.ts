import { Timestamp } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';
import {
  EMPTY_TRANSACTION_FILTER,
  filterTransactions,
  isFilterActive,
} from '../transactionFilters';
import type { TransactionFilter } from '../transactionFilters';
import type { Transaction } from '../types';
import { accountRef, cardRef, makeTxn, STUB_TS } from './fixtures';

// Construye un Transaction (con id/BaseDoc) a partir del draft de fixtures. La fecha es real
// (Timestamp) porque el filtro por rango llama `date.toMillis()`.
function txn(partial: Partial<Transaction> = {}): Transaction {
  return {
    ...makeTxn(),
    id: 'txn-1',
    createdAt: STUB_TS,
    updatedAt: STUB_TS,
    schemaVersion: 1,
    date: Timestamp.fromMillis(Date.parse('2026-06-15T12:00:00')),
    ...partial,
  };
}

const filter = (overrides: Partial<TransactionFilter>): TransactionFilter => ({
  ...EMPTY_TRANSACTION_FILTER,
  ...overrides,
});

describe('filterTransactions', () => {
  it('el filtro vacío devuelve todo, en el mismo orden', () => {
    const txns = [txn({ id: 'a' }), txn({ id: 'b' }), txn({ id: 'c' })];
    expect(filterTransactions(txns, EMPTY_TRANSACTION_FILTER).map((t) => t.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('filtra por texto en concepto, nota y etiquetas (sin tildes)', () => {
    const txns = [
      txn({ id: 'luz', concept: 'Pago de Luz' }),
      txn({ id: 'note', concept: 'Varios', note: 'crédito banco' }),
      txn({ id: 'tag', concept: 'Café', tags: ['hormiga'] }),
    ];
    expect(filterTransactions(txns, filter({ text: 'luz' })).map((t) => t.id)).toEqual(['luz']);
    expect(filterTransactions(txns, filter({ text: 'credito' })).map((t) => t.id)).toEqual([
      'note',
    ]);
    expect(filterTransactions(txns, filter({ text: 'hormiga' })).map((t) => t.id)).toEqual(['tag']);
  });

  it('hormigaOnly deja solo los gastos con etiqueta hormiga', () => {
    const txns = [
      txn({ id: 'normal', concept: 'Mercado', tags: [] }),
      txn({ id: 'hormiga', concept: 'Café', tags: ['hormiga'] }),
    ];
    expect(filterTransactions(txns, filter({ hormigaOnly: true })).map((t) => t.id)).toEqual([
      'hormiga',
    ]);
    expect(isFilterActive(filter({ hormigaOnly: true }))).toBe(true);
  });

  it('filtra por tipo de movimiento', () => {
    const txns = [
      txn({ id: 'gasto', type: 'expense' }),
      txn({ id: 'ingreso', type: 'income' }),
      txn({ id: 'transf', type: 'transfer' }),
    ];
    expect(filterTransactions(txns, filter({ type: 'income' })).map((t) => t.id)).toEqual([
      'ingreso',
    ]);
  });

  it('filtra por categoría exacta', () => {
    const txns = [
      txn({ id: 'a', categoryId: 'cat-comidas' }),
      txn({ id: 'b', categoryId: 'cat-ocio' }),
    ];
    expect(filterTransactions(txns, filter({ categoryId: 'cat-ocio' })).map((t) => t.id)).toEqual([
      'b',
    ]);
  });

  it('filtra por cuenta/medio tanto en origen como en destino', () => {
    const txns = [
      txn({ id: 'desde', source: accountRef('acc-1'), destination: null }),
      txn({
        id: 'hacia',
        type: 'transfer',
        source: accountRef('acc-9'),
        destination: accountRef('acc-1'),
      }),
      txn({ id: 'otra', source: cardRef('card-1'), destination: null }),
    ];
    expect(
      filterTransactions(txns, filter({ entityKey: 'account:acc-1' })).map((t) => t.id),
    ).toEqual(['desde', 'hacia']);
    expect(filterTransactions(txns, filter({ entityKey: 'card:card-1' })).map((t) => t.id)).toEqual(
      ['otra'],
    );
  });

  it('filtra por rango de fechas (cotas inclusivas)', () => {
    const at = (iso: string) => Timestamp.fromMillis(Date.parse(`${iso}T12:00:00`));
    const txns = [
      txn({ id: 'jun01', date: at('2026-06-01') }),
      txn({ id: 'jun15', date: at('2026-06-15') }),
      txn({ id: 'jun30', date: at('2026-06-30') }),
    ];
    const from = Date.parse('2026-06-10T00:00:00');
    const to = Date.parse('2026-06-20T23:59:59.999');
    expect(
      filterTransactions(txns, filter({ fromMillis: from, toMillis: to })).map((t) => t.id),
    ).toEqual(['jun15']);
  });

  it('combina criterios con AND', () => {
    const txns = [
      txn({ id: 'match', type: 'expense', categoryId: 'cat-ocio', concept: 'Cine' }),
      txn({ id: 'tipo', type: 'income', categoryId: 'cat-ocio', concept: 'Cine' }),
      txn({ id: 'texto', type: 'expense', categoryId: 'cat-ocio', concept: 'Otra cosa' }),
    ];
    const result = filterTransactions(
      txns,
      filter({ type: 'expense', categoryId: 'cat-ocio', text: 'cine' }),
    );
    expect(result.map((t) => t.id)).toEqual(['match']);
  });
});

describe('isFilterActive', () => {
  it('false con el filtro vacío', () => {
    expect(isFilterActive(EMPTY_TRANSACTION_FILTER)).toBe(false);
  });

  it('true si algún criterio está puesto', () => {
    expect(isFilterActive(filter({ text: 'luz' }))).toBe(true);
    expect(isFilterActive(filter({ type: 'expense' }))).toBe(true);
    expect(isFilterActive(filter({ categoryId: 'cat-ocio' }))).toBe(true);
    expect(isFilterActive(filter({ fromMillis: 0 }))).toBe(true);
  });
});
