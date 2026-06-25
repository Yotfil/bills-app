// Reportes / insights más ricos (CLAUDE.md §15): tendencias mes a mes, top categorías y
// gasto hormiga histórico. Funciones PURAS sobre el conjunto completo de movimientos; la UI
// (capa de arriba) las alimenta y dibuja. Reutilizan la regla de oro de reportes (§5.4): el
// gasto cuenta SOLO `expense`. Para no acoplar el dominio a `Timestamp`, el mes de cada
// movimiento llega como una función `monthOf` (la UI pasa `(t) => monthKey(t.date)`).
import { spendByCategory, totalHormiga, totalSpend } from './reports';
import type { TransactionDraft } from './types';
import type { MonthlyInsight } from './MonthlyInsight';
import type { CategoryTotal } from './CategoryTotal';

export type { MonthlyInsight } from './MonthlyInsight';
export type { CategoryTotal } from './CategoryTotal';

/**
 * Métricas (ingreso, gasto, hormiga) por cada mes de `months`, en ese mismo orden. Los meses
 * sin movimientos quedan en cero (la gráfica muestra la serie completa, no huecos).
 */
export function monthlyInsights(
  transactions: TransactionDraft[],
  months: string[],
  monthOf: (txn: TransactionDraft) => string,
): MonthlyInsight[] {
  const wanted = new Set(months);
  const byMonth = new Map<string, TransactionDraft[]>();
  for (const m of months) byMonth.set(m, []);
  for (const txn of transactions) {
    const m = monthOf(txn);
    if (wanted.has(m)) byMonth.get(m)!.push(txn);
  }
  return months.map((month) => {
    const txns = byMonth.get(month)!;
    const income = txns.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    return { month, income, expense: totalSpend(txns), hormiga: totalHormiga(txns) };
  });
}

/**
 * Categorías ordenadas por gasto (mayor a menor) en el conjunto de movimientos recibido. Si se
 * pasa `limit`, devuelve solo las primeras N. Las categorías sin gasto no aparecen.
 */
export function topCategories(transactions: TransactionDraft[], limit?: number): CategoryTotal[] {
  const byCat = spendByCategory(transactions);
  const ranked = Object.entries(byCat)
    .map(([categoryId, total]) => ({ categoryId, total }))
    .sort((a, b) => b.total - a.total);
  return limit === undefined ? ranked : ranked.slice(0, limit);
}
