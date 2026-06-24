import { describe, expect, it } from 'vitest';
import { isLoanCuotaPaid, linkedMonthlyCuota, loanHasLinkedFixed } from '../loanCuota';
import type { FixedObligationTemplate } from '../types';
import { makeFixed, makeLoan } from './fixtures';

// El vínculo es implícito: un fijo "abono a deuda" cuyo debtTargetId apunta al crédito ES su cuota.
const tpl = (partial: Partial<FixedObligationTemplate>): FixedObligationTemplate =>
  ({
    id: 'tpl',
    archived: false,
    payKind: 'expense',
    debtTargetId: null,
    ...partial,
  }) as FixedObligationTemplate;

describe('loanHasLinkedFixed', () => {
  const loan = makeLoan({ id: 'loan-carro' });

  it('true si hay una plantilla abono a deuda que apunta al crédito', () => {
    const templates = [tpl({ payKind: 'debt_payment', debtTargetId: 'loan-carro' })];
    expect(loanHasLinkedFixed(loan, templates)).toBe(true);
  });

  it('false si la plantilla apunta a otro destino o es gasto o está archivada', () => {
    expect(loanHasLinkedFixed(loan, [tpl({ payKind: 'debt_payment', debtTargetId: 'otro' })])).toBe(
      false,
    );
    expect(loanHasLinkedFixed(loan, [tpl({ payKind: 'expense' })])).toBe(false);
    expect(
      loanHasLinkedFixed(loan, [
        tpl({ payKind: 'debt_payment', debtTargetId: 'loan-carro', archived: true }),
      ]),
    ).toBe(false);
  });
});

describe('linkedMonthlyCuota', () => {
  const loan = makeLoan({ id: 'loan-carro' });

  it('devuelve el fijo mensual abono a deuda que apunta al crédito', () => {
    const cuota = makeFixed({
      id: 'fx-carro',
      payKind: 'debt_payment',
      debtTargetId: 'loan-carro',
    });
    const otros = [
      makeFixed({ id: 'fx-luz' }),
      makeFixed({ id: 'fx-otro', payKind: 'debt_payment', debtTargetId: 'otro' }),
    ];
    expect(linkedMonthlyCuota(loan, [...otros, cuota])?.id).toBe('fx-carro');
  });

  it('null si no hay ninguno', () => {
    expect(linkedMonthlyCuota(loan, [makeFixed({ id: 'fx-luz' })])).toBeNull();
  });
});

describe('isLoanCuotaPaid', () => {
  const loan = makeLoan({ id: 'loan-carro' });
  const cuota = (status: 'pending' | 'allocated' | 'paid') =>
    makeFixed({ payKind: 'debt_payment', debtTargetId: 'loan-carro', status });

  it('true solo cuando el fijo ligado del mes está pagado', () => {
    expect(isLoanCuotaPaid(loan, [cuota('paid')])).toBe(true);
    expect(isLoanCuotaPaid(loan, [cuota('pending')])).toBe(false);
    expect(isLoanCuotaPaid(loan, [cuota('allocated')])).toBe(false);
    expect(isLoanCuotaPaid(loan, [])).toBe(false);
  });
});
