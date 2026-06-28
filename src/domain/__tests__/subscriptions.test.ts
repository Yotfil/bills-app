import { describe, it, expect } from 'vitest';
import {
  subscriptionRows,
  subscriptionTotals,
  daysUntilRenewal,
  upcomingRenewals,
} from '../subscriptions';
import { makeTemplate, makeTxn } from './fixtures';

const SUBS = 'cat-suscripciones';

// La UI pasa (t) => dayKey(t.date); en los tests cada txn lleva su clave en `note` para no
// depender de Timestamp (las fixtures usan un STUB_TS sin fecha real).
const dateKeyOf = (t: { note: string | null }) => t.note ?? '2026-01-01';

function charge(concept: string, amount: number, dateKey: string) {
  return makeTxn({ type: 'expense', categoryId: SUBS, concept, amount, note: dateKey });
}

describe('subscriptionRows', () => {
  it('lista solo los fijos activos de la categoría de suscripciones, ordenados por monto desc', () => {
    const templates = [
      makeTemplate({ id: 't1', name: 'Netflix', categoryId: SUBS, budgetedAmount: 50_000 }),
      makeTemplate({ id: 't2', name: 'Cursor', categoryId: SUBS, budgetedAmount: 250_000 }),
      makeTemplate({ id: 't3', name: 'Luz', categoryId: 'cat-servicios', budgetedAmount: 230_000 }),
      makeTemplate({ id: 't4', name: 'Viejo', categoryId: SUBS, archived: true }),
      makeTemplate({ id: 't5', name: 'Inactivo', categoryId: SUBS, active: false }),
    ];
    const rows = subscriptionRows(templates, [], SUBS, dateKeyOf);
    expect(rows.map((r) => r.name)).toEqual(['Cursor', 'Netflix']);
  });

  it('devuelve [] si no hay categoría de suscripciones resuelta', () => {
    const templates = [makeTemplate({ name: 'Netflix', categoryId: SUBS })];
    expect(subscriptionRows(templates, [], null, dateKeyOf)).toEqual([]);
  });

  it('detecta subida de precio comparando los dos meses más recientes', () => {
    const templates = [makeTemplate({ id: 't1', name: 'Claude', categoryId: SUBS })];
    const txns = [
      charge('Claude', 75_000, '2026-04-10'),
      charge('Claude', 75_000, '2026-05-10'),
      charge('Claude', 90_000, '2026-06-10'),
    ];
    const [row] = subscriptionRows(templates, txns, SUBS, dateKeyOf);
    expect(row!.priceIncrease).toEqual({ previous: 75_000, current: 90_000, delta: 15_000 });
  });

  it('no reporta subida si el precio se mantuvo o bajó', () => {
    const templates = [makeTemplate({ id: 't1', name: 'Netflix', categoryId: SUBS })];
    const txns = [charge('Netflix', 50_000, '2026-05-10'), charge('Netflix', 45_000, '2026-06-10')];
    const [row] = subscriptionRows(templates, txns, SUBS, dateKeyOf);
    expect(row!.priceIncrease).toBeNull();
  });

  it('sin historial: sin subida de precio, sin día de renovación', () => {
    const templates = [makeTemplate({ id: 't1', name: 'CapCut', categoryId: SUBS })];
    const [row] = subscriptionRows(templates, [], SUBS, dateKeyOf);
    expect(row!.priceIncrease).toBeNull();
    expect(row!.renewalDay).toBeNull();
    expect(row!.lastChargeDateKey).toBeNull();
  });

  it('deriva el día de renovación del último cobro', () => {
    const templates = [makeTemplate({ id: 't1', name: 'Drive', categoryId: SUBS })];
    const txns = [charge('Drive', 79_000, '2026-05-03'), charge('Drive', 79_000, '2026-06-17')];
    const [row] = subscriptionRows(templates, txns, SUBS, dateKeyOf);
    expect(row!.renewalDay).toBe(17);
    expect(row!.lastChargeDateKey).toBe('2026-06-17');
  });

  it('ignora movimientos que no son gasto o no son de la categoría (regla de oro §5.4)', () => {
    const templates = [makeTemplate({ id: 't1', name: 'Netflix', categoryId: SUBS })];
    const txns = [
      makeTxn({ type: 'transfer', categoryId: SUBS, concept: 'Netflix', amount: 99_000, note: '2026-06-10' }),
      makeTxn({ type: 'expense', categoryId: 'cat-ocio', concept: 'Netflix', amount: 99_000, note: '2026-06-11' }),
    ];
    const [row] = subscriptionRows(templates, txns, SUBS, dateKeyOf);
    expect(row!.priceIncrease).toBeNull();
    expect(row!.renewalDay).toBeNull();
  });

  it('lee cancelCandidate del fijo (false si no está)', () => {
    const templates = [
      makeTemplate({ id: 't1', name: 'A', categoryId: SUBS, budgetedAmount: 2, cancelCandidate: true }),
      makeTemplate({ id: 't2', name: 'B', categoryId: SUBS, budgetedAmount: 1 }),
    ];
    const rows = subscriptionRows(templates, [], SUBS, dateKeyOf);
    expect(rows.find((r) => r.templateId === 't1')!.cancelCandidate).toBe(true);
    expect(rows.find((r) => r.templateId === 't2')!.cancelCandidate).toBe(false);
  });
});

describe('subscriptionTotals', () => {
  it('suma el mensual y anualiza × 12', () => {
    const templates = [
      makeTemplate({ id: 't1', name: 'Netflix', categoryId: SUBS, budgetedAmount: 50_000 }),
      makeTemplate({ id: 't2', name: 'Cursor', categoryId: SUBS, budgetedAmount: 250_000 }),
    ];
    const totals = subscriptionTotals(subscriptionRows(templates, [], SUBS, dateKeyOf));
    expect(totals.monthly).toBe(300_000);
    expect(totals.annual).toBe(3_600_000);
  });

  it('totales en cero sin suscripciones', () => {
    expect(subscriptionTotals([])).toEqual({ monthly: 0, annual: 0 });
  });
});

describe('daysUntilRenewal', () => {
  it('cuenta hacia adelante en el mismo mes', () => {
    expect(daysUntilRenewal(20, 17, 30)).toBe(3);
  });
  it('es 0 si renueva hoy', () => {
    expect(daysUntilRenewal(17, 17, 30)).toBe(0);
  });
  it('si el día ya pasó, cuenta hasta el próximo mes', () => {
    expect(daysUntilRenewal(3, 28, 30)).toBe(5); // 30-28 + 3
  });
});

describe('upcomingRenewals', () => {
  it('devuelve solo las que renuevan dentro de la ventana, ordenadas por cercanía', () => {
    const templates = [
      makeTemplate({ id: 't1', name: 'Pronto', categoryId: SUBS }),
      makeTemplate({ id: 't2', name: 'Lejos', categoryId: SUBS }),
      makeTemplate({ id: 't3', name: 'SinHistorial', categoryId: SUBS }),
    ];
    const txns = [
      charge('Pronto', 1, '2026-06-18'), // renueva día 18; hoy 17 → 1 día
      charge('Lejos', 1, '2026-06-25'), // día 25 → 8 días
    ];
    const rows = subscriptionRows(templates, txns, SUBS, dateKeyOf);
    const soon = upcomingRenewals(rows, 17, 30, 5);
    expect(soon.map((s) => s.templateId)).toEqual(['t1']);
    expect(soon[0]!.daysUntil).toBe(1);
  });
});
