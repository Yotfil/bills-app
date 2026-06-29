// Auto-registro de gastos fijos en su día de cobro (CLAUDE.md §5.3). Lógica PURA. Sin servidor, el
// disparo ocurre al ABRIR la app: un fijo del mes en curso se auto-paga si tiene día configurado, hoy
// ya llegó o pasó ese día, sigue pendiente y no se auto-pagó ya este mes (guard `autoPaidAt`, que
// persiste tras "Deshacer pago" para no volver a dispararlo). No aplica a respaldados (no se pagan).
import type { FixedObligationMonthly } from './types';

export function isAutoPayDue(
  fixed: FixedObligationMonthly,
  todayDay: number,
  daysInMonth = 31,
): boolean {
  if (fixed.budgetBacked) return false;
  if (fixed.autoPayDay == null) return false;
  if (fixed.status !== 'pending') return false;
  if (fixed.autoPaidAt) return false; // ya se auto-registró este mes (aunque se haya deshecho)
  // En meses cortos (p.ej. día 31 en febrero) se dispara el último día del mes.
  const effectiveDay = Math.min(fixed.autoPayDay, daysInMonth);
  return todayDay >= effectiveDay;
}
