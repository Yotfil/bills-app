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
