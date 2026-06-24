import type { FixedObligationMonthly, FixedObligationTemplate } from './types';

// Cuota fija de una deuda (CLAUDE.md §5.6, §5.5), IMPLÍCITA por `debtTargetId`. Un fijo de tipo
// 'abono a deuda' que apunta a una tarjeta o crédito ES su cuota: el estado de pago del mes se
// DERIVA del fijo mensual correspondiente, así pagar/deshacer en cualquiera de los dos lados queda
// reflejado en el otro sin duplicar la fuente de verdad. Funciona igual para tarjetas y créditos:
// `targetId` es el id de la tarjeta o del crédito.

const targetsDebt = (
  item: { payKind: string; debtTargetId: string | null },
  targetId: string,
): boolean => item.payKind === 'debt_payment' && item.debtTargetId === targetId;

/**
 * `true` si la deuda (tarjeta/crédito) tiene una cuota ligada: existe una plantilla de fijo (no
 * archivada) de tipo abono a deuda que apunta a ella. Decide si la tarjeta muestra el estado del mes.
 */
export function hasLinkedCuota(targetId: string, templates: FixedObligationTemplate[]): boolean {
  return templates.some((t) => !t.archived && targetsDebt(t, targetId));
}

/**
 * Devuelve la instancia mensual del fijo ligado a esta deuda para el mes ya cargado, o `null` si
 * no hay ninguna (no ligada, o aún no se generó). `monthlies` es la lista del mes que interesa.
 */
export function cuotaMonthlyFor(
  targetId: string,
  monthlies: FixedObligationMonthly[],
): FixedObligationMonthly | null {
  return monthlies.find((m) => targetsDebt(m, targetId)) ?? null;
}

/** `true` si la cuota del mes (el fijo ligado) ya está pagada. */
export function isCuotaPaid(targetId: string, monthlies: FixedObligationMonthly[]): boolean {
  return cuotaMonthlyFor(targetId, monthlies)?.status === 'paid';
}
