import { describe, it, expect } from 'vitest';
import { generateMonthlyFixeds } from '../rollover';
import { fixedTotals } from '../fixed';
import { accountRef, makeFixed, STUB_TS } from './fixtures';
import type { FixedObligationTemplate } from '../types';

// CLAUDE.md §12.1 — Rollover mensual (§5.10) y totales del checklist (§8.3).

function makeTemplate(partial: Partial<FixedObligationTemplate> = {}): FixedObligationTemplate {
  return {
    id: 'tpl-1',
    createdAt: STUB_TS,
    updatedAt: STUB_TS,
    schemaVersion: 1,
    archived: false,
    archivedAt: null,
    name: 'Arriendo',
    budgetedAmount: 1_650_000,
    categoryId: 'cat-vivienda',
    defaultPaymentMethod: accountRef('acc-1'),
    payKind: 'expense',
    debtTargetId: null,
    active: true,
    sortOrder: 0,
    ...partial,
  };
}

describe('generateMonthlyFixeds (rollover)', () => {
  it('genera la instancia del mes en estado pending con snapshots de la plantilla', () => {
    const [fixed] = generateMonthlyFixeds([makeTemplate()], '2026-07');
    expect(fixed?.status).toBe('pending');
    expect(fixed?.month).toBe('2026-07');
    expect(fixed?.name).toBe('Arriendo');
    expect(fixed?.budgetedAmount).toBe(1_650_000);
    expect(fixed?.paymentMethod).toEqual(accountRef('acc-1'));
    expect(fixed?.transactionId).toBeNull();
  });

  it('omite plantillas archivadas o inactivas', () => {
    const result = generateMonthlyFixeds(
      [
        makeTemplate({ id: 'a', active: true }),
        makeTemplate({ id: 'b', active: false }),
        makeTemplate({ id: 'c', archived: true }),
      ],
      '2026-07',
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.templateId).toBe('a');
  });

  it('no duplica los fijos ya generados este mes (idempotente)', () => {
    const templates = [makeTemplate({ id: 'a' }), makeTemplate({ id: 'b' })];
    const result = generateMonthlyFixeds(templates, '2026-07', ['a']);
    expect(result).toHaveLength(1);
    expect(result[0]?.templateId).toBe('b');
  });
});

describe('fixedTotals', () => {
  it('suma por estado: pendiente, destinado y pagado', () => {
    const fixeds = [
      makeFixed({ status: 'pending', budgetedAmount: 100 }),
      makeFixed({ status: 'pending', budgetedAmount: 50 }),
      makeFixed({ status: 'allocated', budgetedAmount: 200 }),
      makeFixed({ status: 'paid', budgetedAmount: 300 }),
    ];
    const totals = fixedTotals(fixeds);
    expect(totals.pendingAmount).toBe(150);
    expect(totals.allocatedAmount).toBe(200);
    expect(totals.paidAmount).toBe(300);
    expect(totals.counts).toEqual({ pending: 2, allocated: 1, paid: 1, total: 4 });
  });
});
