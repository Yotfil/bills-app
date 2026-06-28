// Módulo de Suscripciones (CLAUDE.md §15). Funciones PURAS que arman la vista derivada de
// suscripciones a partir de la plantilla de fijos y del historial de movimientos. La UI las
// alimenta y dibuja; no hay entidad ni colección nuevas.
//
// Una "suscripción" = un fijo ACTIVO (no archivado) de la categoría "Suscripciones". Sus cobros
// se identifican por concepto: el movimiento que genera pagar un fijo usa el nombre del fijo como
// concepto (§5.3), así que cruzamos por `concept === nombre` dentro de esa categoría. Heurística
// simple y suficiente; no requiere cargar las instancias mensuales de todos los meses.
//
// Para no acoplar el dominio a `Timestamp` (§9.1), la fecha de cada movimiento llega como un
// callback `dateKeyOf` que devuelve 'YYYY-MM-DD' (la UI pasa `(t) => dayKey(t.date)`). Esa clave
// es ordenable lexicográficamente y de ella salen el mes (slice 0-7) y el día (slice 8-10).
import { isSpendTransaction } from './reports';
import type { FixedObligationTemplate, TransactionDraft } from './types';
import type { SubscriptionRow } from './SubscriptionRow';
import type { SubscriptionTotals } from './SubscriptionTotals';
import type { PriceChange } from './PriceChange';

export type { SubscriptionRow } from './SubscriptionRow';
export type { SubscriptionTotals } from './SubscriptionTotals';
export type { PriceChange } from './PriceChange';

interface Charge {
  dateKey: string; // 'YYYY-MM-DD'
  amount: number;
}

/** ¿Es un fijo que cuenta como suscripción? Activo, no archivado y de la categoría dada. */
function isSubscriptionTemplate(t: FixedObligationTemplate, categoryId: string): boolean {
  return t.active && !t.archived && t.categoryId === categoryId;
}

/**
 * Cobros de cada suscripción, agrupados por concepto (nombre del fijo). Solo gastos reales
 * (§5.4) de la categoría de suscripciones. Cada cobro guarda su día y su monto.
 */
function chargesByConcept(
  transactions: TransactionDraft[],
  categoryId: string,
  dateKeyOf: (txn: TransactionDraft) => string,
): Map<string, Charge[]> {
  const byConcept = new Map<string, Charge[]>();
  for (const txn of transactions) {
    if (!isSpendTransaction(txn) || txn.categoryId !== categoryId) continue;
    const key = txn.concept.trim();
    const list = byConcept.get(key) ?? [];
    list.push({ dateKey: dateKeyOf(txn), amount: txn.amount });
    byConcept.set(key, list);
  }
  return byConcept;
}

/**
 * Subida de precio de una suscripción: se reduce a UN monto por mes (el último cobro de cada
 * mes manda) y se comparan los dos meses más recientes. Reporta solo si el último es mayor.
 */
function detectPriceIncrease(charges: Charge[]): PriceChange | null {
  // Último cobro de cada mes (la clave de mes son los primeros 7 chars de 'YYYY-MM-DD').
  const byMonth = new Map<string, number>();
  for (const c of [...charges].sort((a, b) => a.dateKey.localeCompare(b.dateKey))) {
    byMonth.set(c.dateKey.slice(0, 7), c.amount);
  }
  const months = [...byMonth.keys()].sort();
  if (months.length < 2) return null;
  const previous = byMonth.get(months[months.length - 2]!)!;
  const current = byMonth.get(months[months.length - 1]!)!;
  if (current <= previous) return null;
  return { previous, current, delta: current - previous };
}

/**
 * Construye las filas de suscripciones a partir de la plantilla de fijos y los movimientos.
 * Ordenadas por monto mensual descendente (las más caras primero). Si no hay categoría de
 * suscripciones resuelta, devuelve [] (la UI aún no sabe su id).
 */
export function subscriptionRows(
  templates: FixedObligationTemplate[],
  transactions: TransactionDraft[],
  subscriptionsCategoryId: string | null,
  dateKeyOf: (txn: TransactionDraft) => string,
): SubscriptionRow[] {
  if (!subscriptionsCategoryId) return [];
  const charges = chargesByConcept(transactions, subscriptionsCategoryId, dateKeyOf);

  return templates
    .filter((t) => isSubscriptionTemplate(t, subscriptionsCategoryId))
    .map((t) => {
      const list = (charges.get(t.name.trim()) ?? []).sort((a, b) =>
        a.dateKey.localeCompare(b.dateKey),
      );
      const last = list.length > 0 ? list[list.length - 1]! : null;
      return {
        templateId: t.id,
        name: t.name,
        monthlyAmount: t.budgetedAmount,
        cancelCandidate: t.cancelCandidate ?? false,
        lastChargeDateKey: last?.dateKey ?? null,
        renewalDay: last ? Number(last.dateKey.slice(8, 10)) : null,
        priceIncrease: detectPriceIncrease(list),
      };
    })
    .sort((a, b) => b.monthlyAmount - a.monthlyAmount);
}

/** Total mensual (Σ montos) y anualizado (× 12, todas son mensuales). */
export function subscriptionTotals(rows: SubscriptionRow[]): SubscriptionTotals {
  const monthly = rows.reduce((sum, r) => sum + r.monthlyAmount, 0);
  return { monthly, annual: monthly * 12 };
}

/**
 * Días hasta la próxima renovación de una suscripción que se cobra el día `renewalDay`. Si ese
 * día ya pasó este mes, cuenta hasta el mismo día del próximo mes. Devuelve 0 si es hoy.
 */
export function daysUntilRenewal(
  renewalDay: number,
  todayDay: number,
  daysInCurrentMonth: number,
): number {
  if (renewalDay >= todayDay) return renewalDay - todayDay;
  return daysInCurrentMonth - todayDay + renewalDay;
}

/**
 * Suscripciones que renuevan dentro de `withinDays` días, ordenadas por cercanía. Para el aviso
 * suave del dashboard de suscripciones ("N renuevan pronto").
 */
export function upcomingRenewals(
  rows: SubscriptionRow[],
  todayDay: number,
  daysInCurrentMonth: number,
  withinDays: number,
): Array<{ templateId: string; daysUntil: number }> {
  return rows
    .filter((r) => r.renewalDay !== null)
    .map((r) => ({
      templateId: r.templateId,
      daysUntil: daysUntilRenewal(r.renewalDay!, todayDay, daysInCurrentMonth),
    }))
    .filter((x) => x.daysUntil <= withinDays)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}
