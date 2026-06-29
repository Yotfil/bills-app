import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { addMonths, recentMonthKeys, transactionPeriodMonth } from './date';

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

describe('transactionPeriodMonth', () => {
  // 15 de junio 2026 a mediodía local.
  const juneDate = Timestamp.fromDate(new Date(2026, 5, 15, 12, 0, 0));

  it('usa periodMonth cuando existe (fijo pagado por adelantado)', () => {
    expect(transactionPeriodMonth({ periodMonth: '2026-07', date: juneDate })).toBe('2026-07');
  });

  it('cae al mes de la fecha cuando periodMonth es null', () => {
    expect(transactionPeriodMonth({ periodMonth: null, date: juneDate })).toBe('2026-06');
  });
});
