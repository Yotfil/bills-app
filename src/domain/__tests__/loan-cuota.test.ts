import { describe, expect, it } from 'vitest';
import { isLoanCuotaPaid, linkedMonthlyCuota } from '../loanCuota';
import { makeFixed, makeLoan } from './fixtures';

describe('linkedMonthlyCuota', () => {
  it('null si el crédito no está ligado', () => {
    const loan = makeLoan({ linkedFixedTemplateId: null });
    expect(linkedMonthlyCuota(loan, [makeFixed({ templateId: 'tpl-1' })])).toBeNull();
  });

  it('null si está ligado pero no existe el fijo del mes', () => {
    const loan = makeLoan({ linkedFixedTemplateId: 'tpl-carro' });
    expect(linkedMonthlyCuota(loan, [makeFixed({ templateId: 'tpl-otro' })])).toBeNull();
  });

  it('devuelve el fijo mensual cuyo templateId coincide con el vínculo', () => {
    const loan = makeLoan({ linkedFixedTemplateId: 'tpl-carro' });
    const cuota = makeFixed({ id: 'fx-carro', templateId: 'tpl-carro' });
    const result = linkedMonthlyCuota(loan, [makeFixed({ templateId: 'tpl-otro' }), cuota]);
    expect(result?.id).toBe('fx-carro');
  });
});

describe('isLoanCuotaPaid', () => {
  const loan = makeLoan({ linkedFixedTemplateId: 'tpl-carro' });

  it('true cuando el fijo ligado del mes está pagado', () => {
    const cuota = makeFixed({ templateId: 'tpl-carro', status: 'paid' });
    expect(isLoanCuotaPaid(loan, [cuota])).toBe(true);
  });

  it('false cuando está pendiente o destinado', () => {
    expect(isLoanCuotaPaid(loan, [makeFixed({ templateId: 'tpl-carro', status: 'pending' })])).toBe(
      false,
    );
    expect(
      isLoanCuotaPaid(loan, [makeFixed({ templateId: 'tpl-carro', status: 'allocated' })]),
    ).toBe(false);
  });

  it('false cuando no hay fijo del mes', () => {
    expect(isLoanCuotaPaid(loan, [])).toBe(false);
  });
});
