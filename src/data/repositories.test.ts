import { describe, it, expect } from 'vitest';
import { buildAccountCreateInput } from './accountRepository';
import { buildCardCreateInput } from './cardRepository';
import { buildFixedTemplateCreateInput } from './fixedTemplateRepository';
import { buildBudgetCreateInput } from './budgetRepository';
import { buildLoanCreateInput } from './loanRepository';

// Los repositorios arman el documento a crear con defaults sensatos (parte pura, testeable).

describe('buildAccountCreateInput', () => {
  it('el saldo arranca igual a la semilla (initialBalance)', () => {
    const input = buildAccountCreateInput({
      name: '  Bancolombia ',
      type: 'savings',
      initialBalance: 1_000_000,
    });
    expect(input.cachedBalance).toBe(1_000_000);
    expect(input.initialBalance).toBe(1_000_000);
    expect(input.name).toBe('Bancolombia'); // recorta espacios
    expect(input.archived).toBe(false);
    expect(input.archivedAt).toBeNull();
  });
});

describe('buildCardCreateInput', () => {
  it('la deuda arranca en la semilla y guarda el cupo', () => {
    const input = buildCardCreateInput({
      name: 'TC',
      creditLimit: 2_000_000,
      initialDebt: 350_000,
    });
    expect(input.creditLimit).toBe(2_000_000);
    expect(input.cachedDebt).toBe(350_000);
    expect(input.initialDebt).toBe(350_000); // semilla persistida para el recálculo (§9.3)
    expect(input.archived).toBe(false);
  });
});

describe('buildFixedTemplateCreateInput', () => {
  it('nace activa y sin archivar, con sus snapshots', () => {
    const input = buildFixedTemplateCreateInput({
      name: '  Luz ',
      budgetedAmount: 230_000,
      categoryId: 'cat-servicios',
      defaultPaymentMethod: { kind: 'account', id: 'acc-1' },
      payKind: 'expense',
      debtTargetId: null,
    });
    expect(input.name).toBe('Luz');
    expect(input.active).toBe(true);
    expect(input.archived).toBe(false);
    expect(input.payKind).toBe('expense');
  });
});

describe('buildBudgetCreateInput', () => {
  it('nace activo y sin archivar, con su categoría y tope', () => {
    const input = buildBudgetCreateInput({ categoryId: 'cat-ocio', monthlyLimit: 400_000 });
    expect(input.categoryId).toBe('cat-ocio');
    expect(input.monthlyLimit).toBe(400_000);
    expect(input.active).toBe(true);
    expect(input.archived).toBe(false);
  });
});

describe('buildLoanCreateInput', () => {
  it('el saldo arranca en la semilla; la tasa por defecto es null', () => {
    const input = buildLoanCreateInput({
      name: 'Crédito carro',
      originalAmount: 50_000_000,
      currentBalance: 30_000_000,
      monthlyPayment: 2_700_000,
    });
    expect(input.cachedBalance).toBe(30_000_000);
    expect(input.seedBalance).toBe(30_000_000); // semilla persistida para el recálculo (§9.3)
    expect(input.originalAmount).toBe(50_000_000);
    expect(input.annualRate).toBeNull();
    expect(input.archived).toBe(false);
  });
});
