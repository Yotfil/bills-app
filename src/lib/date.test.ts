import { describe, it, expect } from 'vitest';
import { addMonths, currentMonthKey, fixedPaymentDate, monthKey, recentMonthKeys } from './date';

describe('addMonths', () => {
  it('desplaza meses cruzando el cambio de año', () => {
    expect(addMonths('2026-06', -1)).toBe('2026-05');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
  });
});

describe('recentMonthKeys', () => {
  it('devuelve las últimas N claves de mes en orden ascendente, terminando en endMonth', () => {
    expect(recentMonthKeys(3, '2026-06')).toEqual(['2026-04', '2026-05', '2026-06']);
  });

  it('cruza el cambio de año', () => {
    expect(recentMonthKeys(3, '2026-01')).toEqual(['2025-11', '2025-12', '2026-01']);
  });

  it('count=1 es solo el mes final', () => {
    expect(recentMonthKeys(1, '2026-06')).toEqual(['2026-06']);
  });
});

describe('fixedPaymentDate', () => {
  it('un fijo de OTRO mes se fecha dentro de ese mes (no hoy)', () => {
    // Febrero 2020 nunca es el mes en curso: cae en la rama "otro mes".
    const ts = fixedPaymentDate('2020-02');
    expect(monthKey(ts)).toBe('2020-02');
    // El día se acota al último del mes (feb 2020 tuvo 29 días).
    expect(ts.toDate().getDate()).toBeLessThanOrEqual(29);
  });

  it('un fijo del mes en curso se fecha en el mes en curso', () => {
    const ts = fixedPaymentDate(currentMonthKey());
    expect(monthKey(ts)).toBe(currentMonthKey());
  });
});
