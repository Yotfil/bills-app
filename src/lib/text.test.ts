import { describe, expect, it } from 'vitest';
import { matchesQuery, normalizeText } from './text';

describe('normalizeText', () => {
  it('pasa a minúsculas y quita tildes', () => {
    expect(normalizeText('Préstamo ÁÉÍÓÚ')).toBe('prestamo aeiou');
  });
});

describe('matchesQuery', () => {
  it('coincide ignorando mayúsculas y tildes', () => {
    expect(matchesQuery('luz', 'Pago de Luz')).toBe(true);
    expect(matchesQuery('credito', 'Crédito AV Villas')).toBe(true);
  });

  it('exige que TODAS las palabras estén presentes (orden libre)', () => {
    expect(matchesQuery('merc yul', 'Cuota mercado Yulieth')).toBe(true);
    expect(matchesQuery('mercado carro', 'Cuota mercado Yulieth')).toBe(false);
  });

  it('busca en varios campos a la vez', () => {
    expect(matchesQuery('netflix', 'Suscripción', 'Netflix mensual')).toBe(true);
  });

  it('una consulta vacía o en blanco coincide con todo', () => {
    expect(matchesQuery('', 'lo que sea')).toBe(true);
    expect(matchesQuery('   ', 'lo que sea')).toBe(true);
  });

  it('ignora campos nulos/indefinidos sin romperse', () => {
    expect(matchesQuery('hola', null, undefined, 'hola mundo')).toBe(true);
  });
});
