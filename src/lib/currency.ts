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

/**
 * Deja solo los dígitos de un texto y normaliza (quita ceros a la izquierda). Sirve para que el
 * usuario pueda escribir o PEGAR un valor con o sin formato y siempre quedar el entero crudo:
 *   "1000" -> "1000" | "1.000" -> "1000" | "$ 1.650.000" -> "1650000" | "" -> "" | "000" -> "0".
 */
export function digitsOnly(text: string): string {
  const digits = text.replace(/\D/g, '');
  if (digits === '') return '';
  return String(parseInt(digits, 10)); // parseInt quita ceros a la izquierda; "000" -> "0"
}

/**
 * Formatea un string de dígitos crudos para mostrarlo en un input con separador de miles:
 *   "1000" -> "1.000" | "" -> "" | "0" -> "0". (Pasa por `digitsOnly` por si llega con formato.)
 */
export function formatThousands(rawDigits: string): string {
  const digits = digitsOnly(rawDigits);
  if (digits === '') return '';
  return formatCopPlain(Number(digits));
}
