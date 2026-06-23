import { describe, it, expect } from 'vitest';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import { docConverter } from './converters';
import type { Account } from '../domain/types';

// El converter es la única traducción dominio ↔ Firestore (§9.2). Verificamos sus dos reglas
// clave: `id` no se guarda dentro del documento, y se rehidrata desde `doc.id` al leer.

const converter = docConverter<Account>();

describe('docConverter', () => {
  it('toFirestore quita el id (en Firestore el id es la clave del documento)', () => {
    const account = {
      id: 'acc-1',
      name: 'Ahorros',
      cachedBalance: 1_000_000,
      initialBalance: 0,
    } as unknown as Account;

    const persisted = converter.toFirestore(account) as Record<string, unknown>;
    expect(persisted).not.toHaveProperty('id');
    expect(persisted.name).toBe('Ahorros');
    expect(persisted.cachedBalance).toBe(1_000_000);
  });

  it('fromFirestore rehidrata el id desde snapshot.id', () => {
    const snapshot = {
      id: 'acc-42',
      data: () => ({ name: 'Efectivo', cachedBalance: 50_000 }),
    } as unknown as QueryDocumentSnapshot;

    const account = converter.fromFirestore(snapshot);
    expect(account.id).toBe('acc-42');
    expect(account.name).toBe('Efectivo');
    expect(account.cachedBalance).toBe(50_000);
  });

  it('ida y vuelta: leer y volver a escribir no inventa ni pierde campos (salvo id)', () => {
    const snapshot = {
      id: 'acc-7',
      data: () => ({ name: 'CDT', cachedBalance: 9, initialBalance: 9, type: 'term_deposit' }),
    } as unknown as QueryDocumentSnapshot;

    const model = converter.fromFirestore(snapshot);
    const persisted = converter.toFirestore(model) as Record<string, unknown>;
    expect(persisted).toEqual({
      name: 'CDT',
      cachedBalance: 9,
      initialBalance: 9,
      type: 'term_deposit',
    });
  });
});
