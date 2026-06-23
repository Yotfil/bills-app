// Formato de moneda COP (CLAUDE.md §3): separador de miles, sin decimales (1.650.000).
// Los montos se guardan como enteros positivos de pesos; aquí solo se formatean para mostrar.

const COP_FORMATTER = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/**
 * Formatea un entero de pesos como moneda COP, p.ej. 1650000 -> "$ 1.650.000".
 * Redondea por seguridad: los montos del dominio siempre deben ser enteros.
 */
export function formatCop(amount: number): string {
  return COP_FORMATTER.format(Math.round(amount));
}

/** Solo el número con separador de miles, sin símbolo: 1650000 -> "1.650.000". */
export function formatCopPlain(amount: number): string {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Math.round(amount));
}
