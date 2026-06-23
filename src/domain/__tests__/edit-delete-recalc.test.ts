import { describe, it } from 'vitest';

// CATÁLOGO DE TESTS (CLAUDE.md §12.1) — Editar/eliminar movimientos y recálculo total.
// Principio (§2, §9.3): la fuente de verdad son los movimientos; los cachés se derivan.

describe('Editar una transacción', () => {
  it.todo('recalcula los saldos afectados (revierte el efecto viejo y aplica el nuevo)');
  it.todo('cambiar el monto ajusta el cachedBalance por la diferencia');
  it.todo('cambiar la cuenta origen mueve el efecto de una cuenta a otra');
});

describe('Eliminar una transacción', () => {
  it.todo('revierte por completo su efecto en los saldos');
  it.todo('eliminar un expense con tarjeta baja de nuevo la deuda');
});

describe('Recálculo total (§9.3)', () => {
  it.todo('reconstruye cachedBalance/cachedDebt desde cero a partir de los movimientos');
  it.todo('el resultado coincide con los cachés cuando no hay divergencia');
  it.todo('corrige los cachés si alguna vez divergen');
});
