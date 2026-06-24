// Helpers de fecha para la UI. El dominio guarda `Timestamp`; aquí se traduce a Date/strings
// para mostrar y para los inputs (CLAUDE.md §9.1: la conversión ocurre en la UI).
import { Timestamp } from 'firebase/firestore';

/** Timestamp de "ahora" (fecha por defecto al registrar, §5.4). */
export function nowTimestamp(): Timestamp {
  return Timestamp.fromDate(new Date());
}

/** 'YYYY-MM-DD' local, para `<input type="date">`. */
export function toDateInputValue(ts: Timestamp): string {
  const d = ts.toDate();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/** Convierte el valor de un `<input type="date">` ('YYYY-MM-DD') a Timestamp (mediodía local). */
export function fromDateInputValue(value: string): Timestamp {
  const [year, month, day] = value.split('-').map(Number);
  // Mediodía para evitar saltos de día por zona horaria.
  return Timestamp.fromDate(new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1, 12, 0, 0));
}

/** Clave de día local 'YYYY-MM-DD' para agrupar transacciones (§8.2). */
export function dayKey(ts: Timestamp): string {
  return toDateInputValue(ts);
}

/** Etiqueta amigable del día: "Hoy", "Ayer" o "D de mes". */
export function formatDayLabel(ts: Timestamp): string {
  const key = dayKey(ts);
  const today = dayKey(nowTimestamp());
  const yesterday = dayKey(Timestamp.fromDate(new Date(Date.now() - 86_400_000)));
  if (key === today) return 'Hoy';
  if (key === yesterday) return 'Ayer';
  return ts.toDate().toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });
}

/** Clave de mes 'YYYY-MM' (para agrupar y filtrar por mes, §5.10, §8.1). */
export function monthKey(ts: Timestamp): string {
  return toDateInputValue(ts).slice(0, 7);
}

/** Mes actual como 'YYYY-MM' (periodo por defecto del dashboard, §8.1). */
export function currentMonthKey(): string {
  return monthKey(nowTimestamp());
}

/** Fecha local de hoy como 'YYYY-MM-DD' (p.ej. para la caché diaria de la tasa, §5.11). */
export function todayIsoDate(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/** Desplaza una clave de mes 'YYYY-MM' por `delta` meses (puede ser negativo). */
export function addMonths(month: string, delta: number): string {
  const [year, m] = month.split('-').map(Number);
  const date = new Date(year ?? 1970, (m ?? 1) - 1 + delta, 1);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${mm}`;
}

/**
 * Milisegundos del inicio del día local ('YYYY-MM-DD' → 00:00:00.000). Cota inferior
 * inclusiva del filtro por rango de fechas del Registro (§8.2).
 */
export function dayStartMillis(dateInput: string): number {
  const [year, month, day] = dateInput.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1, 0, 0, 0, 0).getTime();
}

/**
 * Milisegundos del fin del día local ('YYYY-MM-DD' → 23:59:59.999). Cota superior
 * inclusiva del filtro por rango de fechas del Registro (§8.2).
 */
export function dayEndMillis(dateInput: string): number {
  const [year, month, day] = dateInput.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1, 23, 59, 59, 999).getTime();
}

/** Milisegundos → 'YYYY-MM-DD' local, para rehidratar un `<input type="date">`. */
export function millisToDateInput(ms: number): string {
  const d = new Date(ms);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/** Etiqueta de mes: "junio 2026" a partir de 'YYYY-MM'. */
export function formatMonthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number);
  return new Date(year ?? 1970, (m ?? 1) - 1, 1).toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric',
  });
}
