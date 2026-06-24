import { describe, it, expect } from 'vitest';
import { formatCop, formatCopPlain, digitsOnly, formatThousands } from './currency';

describe('formatCopPlain', () => {
  it('agrega separadores de miles sin decimales', () => {
    expect(formatCopPlain(1650000)).toBe('1.650.000');
  });

  it('formatea cero', () => {
    expect(formatCopPlain(0)).toBe('0');
  });

  it('redondea valores no enteros', () => {
    expect(formatCopPlain(214999.6)).toBe('215.000');
  });
});

describe('formatCop', () => {
  it('incluye el simbolo de moneda y sin decimales', () => {
    // El formateador de Intl puede usar un espacio no separable tras el simbolo,
    // por eso comprobamos las partes por separado en vez del string exacto.
    const result = formatCop(230000);
    expect(result).toContain('230.000');
    expect(result).toContain('$');
  });
});

// Helpers del MoneyInput: formateo en vivo del campo de monto (puntos de miles) y pegado.
describe('digitsOnly', () => {
  it('deja solo los dígitos al escribir', () => {
    expect(digitsOnly('1000')).toBe('1000');
    expect(digitsOnly('')).toBe('');
  });

  it('acepta un valor PEGADO ya formateado (con puntos o símbolo)', () => {
    expect(digitsOnly('1.000')).toBe('1000');
    expect(digitsOnly('1.650.000')).toBe('1650000');
    expect(digitsOnly('$ 1.650.000')).toBe('1650000');
  });

  it('normaliza los ceros a la izquierda', () => {
    expect(digitsOnly('000')).toBe('0');
    expect(digitsOnly('01000')).toBe('1000');
  });
});

describe('formatThousands', () => {
  it('formatea dígitos crudos para mostrarlos en el input', () => {
    expect(formatThousands('1000')).toBe('1.000');
    expect(formatThousands('1650000')).toBe('1.650.000');
  });

  it('vacío se queda vacío; cero se muestra como 0', () => {
    expect(formatThousands('')).toBe('');
    expect(formatThousands('0')).toBe('0');
  });

  it('es idempotente: re-formatear un valor ya formateado no lo cambia', () => {
    expect(formatThousands(formatThousands('1000'))).toBe('1.000');
  });
});
