import { describe, it, expect } from 'vitest';
import { estimatePayoffMonths } from '../loanProjection';
import { loanProgress } from '../derived';
import { makeLoan } from './fixtures';

// CLAUDE.md §5.6 — Progreso de amortización y fecha estimada de pago.

describe('loanProgress', () => {
  it('= 1 − saldo/original, acotado a [0,1]', () => {
    expect(
      loanProgress(makeLoan({ originalAmount: 10_000_000, cachedBalance: 2_500_000 })),
    ).toBeCloseTo(0.75, 5);
    expect(loanProgress(makeLoan({ originalAmount: 10_000_000, cachedBalance: 0 }))).toBe(1);
  });
});

describe('estimatePayoffMonths', () => {
  it('sin tasa: aproximación = ceil(saldo / cuota)', () => {
    const loan = makeLoan({ cachedBalance: 2_700_000, monthlyPayment: 900_000, annualRate: null });
    expect(estimatePayoffMonths(loan)).toBe(3);
  });

  it('saldo en cero → 0 meses', () => {
    expect(estimatePayoffMonths(makeLoan({ cachedBalance: 0 }))).toBe(0);
  });

  it('cuota <= 0 → null (no se puede proyectar)', () => {
    expect(
      estimatePayoffMonths(makeLoan({ cachedBalance: 1_000_000, monthlyPayment: 0 })),
    ).toBeNull();
  });

  it('con tasa: usa amortización (más meses que la aproximación lineal)', () => {
    const loan = makeLoan({ cachedBalance: 1_000_000, monthlyPayment: 100_000, annualRate: 0.24 });
    const months = estimatePayoffMonths(loan);
    expect(months).not.toBeNull();
    expect(months!).toBeGreaterThan(10); // lineal daría 10; con interés, más
  });

  it('cuota que no cubre el interés → null', () => {
    const loan = makeLoan({ cachedBalance: 10_000_000, monthlyPayment: 50_000, annualRate: 0.24 });
    expect(estimatePayoffMonths(loan)).toBeNull();
  });
});
