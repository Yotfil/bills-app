import { describe, it, expect } from 'vitest';
import { formatCop, formatCopPlain } from './currency';

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
