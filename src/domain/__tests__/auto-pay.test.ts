import { describe, expect, it } from 'vitest';
import { isAutoPayDue } from '../autoPay';
import { makeFixed } from './fixtures';
import { Timestamp } from 'firebase/firestore';

// Auto-registro de gastos fijos en su día de cobro (CLAUDE.md §5.3).
describe('isAutoPayDue', () => {
  it('vence cuando hoy ya alcanzó/pasó el día, pendiente y sin auto previo', () => {
    const f = makeFixed({ autoPayDay: 29, status: 'pending' });
    expect(isAutoPayDue(f, 29)).toBe(true); // el mismo día
    expect(isAutoPayDue(f, 30)).toBe(true); // días después
    expect(isAutoPayDue(f, 28)).toBe(false); // antes del día
  });

  it('no vence sin día configurado', () => {
    expect(isAutoPayDue(makeFixed({ autoPayDay: null }), 15)).toBe(false);
    expect(isAutoPayDue(makeFixed({}), 15)).toBe(false); // ausente
  });

  it('no vence si ya no está pendiente', () => {
    expect(isAutoPayDue(makeFixed({ autoPayDay: 5, status: 'paid' }), 10)).toBe(false);
    expect(isAutoPayDue(makeFixed({ autoPayDay: 5, status: 'allocated' }), 10)).toBe(false);
  });

  it('no vence si ya se auto-registró este mes (guard, persiste tras "Deshacer")', () => {
    const f = makeFixed({ autoPayDay: 5, status: 'pending', autoPaidAt: Timestamp.now() });
    expect(isAutoPayDue(f, 10)).toBe(false);
  });

  it('en meses cortos, el día 31 se dispara el último día del mes', () => {
    const f = makeFixed({ autoPayDay: 31, status: 'pending' });
    expect(isAutoPayDue(f, 28, 28)).toBe(true); // 28 de febrero (último día) → vence
    expect(isAutoPayDue(f, 27, 28)).toBe(false); // aún no
  });
});
