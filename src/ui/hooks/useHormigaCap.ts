import { useMemo } from 'react';
import { useUserCollection } from './useUserCollection';
import { useUserSettings } from './useUserSettings';
import { useSessionStore } from '../../store/sessionStore';
import { subscribeTransactions } from '../../data/transactionRepository';
import { setHormigaCapOverride } from '../../data/userRepository';
import { totalHormiga } from '../../domain/reports';
import { monthlyInsights } from '../../domain/insights';
import { resolveHormigaCap, suggestHormigaCap } from '../../domain/hormigaCap';
import { addMonths, currentMonthKey, monthKey, recentMonthKeys } from '../../lib/date';
import type { Transaction } from '../../domain/types';

// Estado y acciones del tope de gasto hormiga (CLAUDE.md §5.8), centralizado para reusar en Inicio,
// Presupuestos y Reportes. El tope es AUTOMÁTICO cada mes (promedio de los meses más bajos de los
// últimos 6); el usuario puede editarlo (override) solo para el mes en curso.
export function useHormigaCap(monthArg?: string) {
  const uid = useSessionStore((s) => s.user?.uid);
  const { items: transactions } = useUserCollection<Transaction>(subscribeTransactions);
  const { settings } = useUserSettings();
  // Por defecto el mes en curso; el Inicio pasa el mes del selector para que la tarjeta refleje
  // el periodo elegido (el gasto hormiga es por mes).
  const month = monthArg ?? currentMonthKey();
  const overrides = settings?.hormigaCapOverrides;

  const currentHormiga = useMemo(
    () => totalHormiga(transactions.filter((t) => monthKey(t.date) === month)),
    [transactions, month],
  );

  // Tope automático: promedio de los más bajos de los 6 meses CERRADOS (sin el mes en curso).
  const autoCap = useMemo(() => {
    const closed = recentMonthKeys(6, addMonths(month, -1));
    const perMonth = monthlyInsights(transactions, closed, (t) => monthKey(t.date));
    return suggestHormigaCap(perMonth.map((m) => m.hormiga));
  }, [transactions, month]);

  const effectiveCap = resolveHormigaCap(overrides, month, autoCap);
  const hasOverride = overrides?.[month] != null;

  /** Fija el tope de ESTE mes (override) o, con null, vuelve al automático. */
  const setCap = (value: number | null) => {
    if (!uid) return Promise.resolve();
    return setHormigaCapOverride(uid, month, value);
  };

  return { month, currentHormiga, autoCap, effectiveCap, hasOverride, setCap };
}
