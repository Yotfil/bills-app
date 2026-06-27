import { describe, expect, it } from 'vitest';
import { resolveHormigaCap, suggestHormigaCap } from '../hormigaCap';

// Tope sugerido de gasto hormiga (CLAUDE.md §5.8).
describe('suggestHormigaCap', () => {
  it('promedia los meses MÁS bajos (no todos)', () => {
    // Los 3 más bajos de [100,200,300,400,500] son 100,200,300 → promedio 200.
    expect(suggestHormigaCap([500, 100, 400, 200, 300])).toBe(200);
  });

  it('excluye meses con $0 (sin datos) del cálculo', () => {
    // Solo cuentan 100 y 300 → promedio 200 (los ceros no arrastran el tope a ~0).
    expect(suggestHormigaCap([0, 100, 0, 300])).toBe(200);
  });

  it('null si hay menos de minMonths meses con datos', () => {
    expect(suggestHormigaCap([0, 0, 500])).toBeNull(); // 1 solo mes con datos
    expect(suggestHormigaCap([])).toBeNull();
  });

  it('si hay menos de lowestN con datos, promedia los que haya', () => {
    expect(suggestHormigaCap([200, 400])).toBe(300); // 2 meses → promedio de ambos
  });

  it('redondea el promedio', () => {
    expect(suggestHormigaCap([100, 100, 101])).toBe(100); // 301/3 = 100.33 → 100
  });
});

describe('resolveHormigaCap', () => {
  it('usa el override solo si es del mes en curso; si no, el automático', () => {
    const override = { month: '2026-06', value: 50_000 };
    expect(resolveHormigaCap(override, '2026-06', 30_000)).toBe(50_000); // override del mes
    expect(resolveHormigaCap(override, '2026-07', 30_000)).toBe(30_000); // override viejo → auto
    expect(resolveHormigaCap(null, '2026-07', 30_000)).toBe(30_000); // sin override → auto
    expect(resolveHormigaCap(null, '2026-07', null)).toBeNull(); // sin override ni base
  });
});
