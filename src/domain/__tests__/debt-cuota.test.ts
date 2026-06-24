import { describe, expect, it } from 'vitest';
import { cuotaMonthlyFor, hasLinkedCuota, isCuotaPaid } from '../debtCuota';
import type { FixedObligationTemplate } from '../types';
import { makeFixed } from './fixtures';

// El vínculo es implícito: un fijo "abono a deuda" cuyo debtTargetId apunta a la deuda ES su cuota.
// `targetId` puede ser el id de un crédito o de una tarjeta — la lógica es la misma.
const tpl = (partial: Partial<FixedObligationTemplate>): FixedObligationTemplate =>
  ({
    id: 'tpl',
    archived: false,
    payKind: 'expense',
    debtTargetId: null,
    ...partial,
  }) as FixedObligationTemplate;

describe('hasLinkedCuota', () => {
  it('true si hay una plantilla abono a deuda que apunta a la deuda (tarjeta o crédito)', () => {
    expect(
      hasLinkedCuota('card-1', [tpl({ payKind: 'debt_payment', debtTargetId: 'card-1' })]),
    ).toBe(true);
  });

  it('false si apunta a otro destino, es gasto, o está archivada', () => {
    expect(hasLinkedCuota('card-1', [tpl({ payKind: 'debt_payment', debtTargetId: 'otro' })])).toBe(
      false,
    );
    expect(hasLinkedCuota('card-1', [tpl({ payKind: 'expense' })])).toBe(false);
    expect(
      hasLinkedCuota('card-1', [
        tpl({ payKind: 'debt_payment', debtTargetId: 'card-1', archived: true }),
      ]),
    ).toBe(false);
  });
});

describe('cuotaMonthlyFor', () => {
  it('devuelve el fijo mensual abono a deuda que apunta a la deuda', () => {
    const cuota = makeFixed({ id: 'fx-tc', payKind: 'debt_payment', debtTargetId: 'card-1' });
    const otros = [
      makeFixed({ id: 'fx-luz' }),
      makeFixed({ id: 'fx-otro', payKind: 'debt_payment', debtTargetId: 'otro' }),
    ];
    expect(cuotaMonthlyFor('card-1', [...otros, cuota])?.id).toBe('fx-tc');
  });

  it('null si no hay ninguno', () => {
    expect(cuotaMonthlyFor('card-1', [makeFixed({ id: 'fx-luz' })])).toBeNull();
  });
});

describe('isCuotaPaid', () => {
  const cuota = (status: 'pending' | 'allocated' | 'paid') =>
    makeFixed({ payKind: 'debt_payment', debtTargetId: 'card-1', status });

  it('true solo cuando el fijo ligado del mes está pagado', () => {
    expect(isCuotaPaid('card-1', [cuota('paid')])).toBe(true);
    expect(isCuotaPaid('card-1', [cuota('pending')])).toBe(false);
    expect(isCuotaPaid('card-1', [cuota('allocated')])).toBe(false);
    expect(isCuotaPaid('card-1', [])).toBe(false);
  });
});
