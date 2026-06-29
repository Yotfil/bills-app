import { describe, expect, it } from 'vitest';
import { mutedPendingTotal } from '../fixed';
import { makeFixed } from './fixtures';

// "Apagar" gastos en Fijos (§8.3): aporte a "Por destinar" de los apagados.
describe('mutedPendingTotal', () => {
  it('suma solo los gastos apagados que están pendientes', () => {
    const a = makeFixed({ id: 'a', status: 'pending', budgetedAmount: 45000 });
    const b = makeFixed({ id: 'b', status: 'pending', budgetedAmount: 120000 });
    const c = makeFixed({ id: 'c', status: 'pending', budgetedAmount: 999 }); // no apagado
    const muted = new Set(['a', 'b']);
    expect(mutedPendingTotal([a, b, c], (id) => muted.has(id))).toBe(165000);
  });

  it('ignora apagados pagados o destinados (no aportan a Por destinar)', () => {
    const paid = makeFixed({ id: 'p', status: 'paid', paidAmount: 50000, budgetedAmount: 50000 });
    const alloc = makeFixed({ id: 'al', status: 'allocated', budgetedAmount: 30000 });
    const muted = new Set(['p', 'al']);
    expect(mutedPendingTotal([paid, alloc], (id) => muted.has(id))).toBe(0);
  });

  it('0 cuando no hay apagados', () => {
    const a = makeFixed({ id: 'a', status: 'pending', budgetedAmount: 45000 });
    expect(mutedPendingTotal([a], () => false)).toBe(0);
  });
});
