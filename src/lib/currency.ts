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

/**
 * Formatea un monto en DIVISA (no COP) con hasta 2 decimales, es-CO: 9918.5 -> "9.918,5".
 * Los montos en divisa sí llevan decimales (un saldo USD tiene centavos); la regla de
 * "enteros sin decimales" (§3) aplica solo a los pesos.
 */
export function formatForeignAmount(amount: number): string {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(amount);
}

/**
 * Normaliza el texto de un input decimal al string crudo con punto: acepta coma o punto como
 * separador (teclados es-CO muestran coma), deja UN solo separador y máximo 2 decimales.
 *   "1234,56" -> "1234.56" | "12." -> "12." (se está escribiendo) | "abc" -> "" | "007" -> "7".
 */
export function normalizeDecimalText(text: string): string {
  const cleaned = text.replace(/,/g, '.').replace(/[^\d.]/g, '');
  if (cleaned === '') return '';
  const dot = cleaned.indexOf('.');
  if (dot === -1) return String(parseInt(cleaned, 10)); // quita ceros a la izquierda
  const intPart = cleaned.slice(0, dot);
  const decimals = cleaned.slice(dot + 1).replace(/\./g, '').slice(0, 2);
  const intNormalized = intPart === '' ? '0' : String(parseInt(intPart, 10));
  return `${intNormalized}.${decimals}`;
}

/** Convierte el texto de un input decimal a número; null si está vacío o no es un número. */
export function parseDecimal(text: string): number | null {
  const normalized = normalizeDecimalText(text);
  if (normalized === '') return null;
  const value = Number(normalized.endsWith('.') ? normalized.slice(0, -1) : normalized);
  return Number.isFinite(value) ? value : null;
}
