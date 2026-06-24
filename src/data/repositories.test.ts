import { describe, it, expect } from 'vitest';
import { buildAccountCreateInput } from './accountRepository';
import { buildCardCreateInput } from './cardRepository';

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
    expect(input.archived).toBe(false);
  });
});
