import { describe, it, expect } from 'vitest';
import {
  formatCop,
  formatCopPlain,
  digitsOnly,
  formatThousands,
  formatForeignAmount,
  normalizeDecimalText,
  parseDecimal,
} from './currency';

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

// Helpers de montos en DIVISA (USD, EUR…): a diferencia del COP, sí llevan decimales.
describe('formatForeignAmount', () => {
  it('formatea con miles y hasta 2 decimales (es-CO: coma decimal)', () => {
    expect(formatForeignAmount(9918.5)).toBe('9.918,5');
    expect(formatForeignAmount(12782)).toBe('12.782');
    expect(formatForeignAmount(1234.567)).toBe('1.234,57');
  });
});

describe('normalizeDecimalText', () => {
  it('acepta coma o punto como separador decimal y normaliza a punto', () => {
    expect(normalizeDecimalText('1234,56')).toBe('1234.56');
    expect(normalizeDecimalText('1234.56')).toBe('1234.56');
  });

  it('permite el separador colgante mientras se escribe', () => {
    expect(normalizeDecimalText('12,')).toBe('12.');
  });

  it('recorta a 2 decimales y descarta separadores extra', () => {
    expect(normalizeDecimalText('1.2.3')).toBe('1.23');
    expect(normalizeDecimalText('10,999')).toBe('10.99');
  });

  it('limpia caracteres no numéricos y ceros a la izquierda', () => {
    expect(normalizeDecimalText('abc')).toBe('');
    expect(normalizeDecimalText('007')).toBe('7');
    expect(normalizeDecimalText(',5')).toBe('0.5');
  });
});

describe('parseDecimal', () => {
  it('convierte el texto a número', () => {
    expect(parseDecimal('1234,56')).toBe(1234.56);
    expect(parseDecimal('12.')).toBe(12);
    expect(parseDecimal('0.5')).toBe(0.5);
  });

  it('vacío o inválido devuelve null', () => {
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('abc')).toBeNull();
  });
});
