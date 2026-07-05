import { useEffect, useRef } from 'react';
import { useUserCollection } from '../hooks/useUserCollection';
import { useUsdRateTable } from '../hooks/useUsdRateTable';
import { useSessionStore } from '../../store/sessionStore';
import { subscribeAccounts } from '../../data/accountRepository';
import { revalueForeignAccounts } from '../../data/revaluationService';
import { computeRevaluation } from '../../domain/revaluation';
import type { Account } from '../../domain/types';
import type { ExchangeRateTable } from '../../domain/ExchangeRateTable';

// Revaluación automática de cuentas en divisa al ABRIR la app (patrón AutoPayWatcher, sin
// servidor): si la tasa del día cambió, alinea el saldo COP con foreignAmount × tasa creando
// un ajuste. Guards en capas: (1) `attempted` en memoria evita re-disparar mientras la
// suscripción refleja el ajuste; (2) un guard en localStorage (compartido entre pestañas del
// dispositivo, escrito ANTES del await) evita que dos pestañas creen el mismo ajuste; (3) la
// idempotencia de dominio (saldo ya alineado → null) es la red final. La carrera exacta entre
// dos DISPOSITIVOS distintos queda como edge asumido (app de un solo usuario). El guard
// incluye foreignAmount y la fecha de la tasa: editar el monto en divisa (o un día nuevo de
// tasa) vuelve a disparar la realineación.
export function RevaluationWatcher() {
  const uid = useSessionStore((s) => s.user?.uid);
  const { items: accounts, loading } = useUserCollection<Account>(subscribeAccounts);
  const { table, loading: tableLoading } = useUsdRateTable();
  const attempted = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Sin tasa (offline sin caché) no se hace nada: degradar con gracia (§5.11).
    if (!uid || loading || tableLoading || !table) return;
    const due = accounts.filter((a) => isDue(uid, a, table, attempted.current));
    if (due.length === 0) return;
    due.forEach((a) => {
      attempted.current.add(memoryKey(a, table));
      writeGuard(uid, a, table); // antes del await: cierra la ventana entre pestañas
    });
    void revalueForeignAccounts(uid, due, table);
  }, [uid, loading, tableLoading, accounts, table]);

  return null;
}

const memoryKey = (a: Account, t: ExchangeRateTable) => `${a.id}:${a.foreignAmount}:${t.date}`;
const guardKey = (uid: string, accountId: string) => `revaluation:${uid}:${accountId}`;
const guardValue = (a: Account, t: ExchangeRateTable) =>
  JSON.stringify({ foreignAmount: a.foreignAmount, rateDate: t.date });

function isDue(uid: string, a: Account, table: ExchangeRateTable, attempted: Set<string>): boolean {
  if (a.archived || !a.foreignCurrency || a.foreignAmount == null) return false;
  if (attempted.has(memoryKey(a, table))) return false;
  if (readGuard(uid, a.id) === guardValue(a, table)) return false;
  return computeRevaluation(a, table) !== null;
}

function readGuard(uid: string, accountId: string): string | null {
  try {
    return localStorage.getItem(guardKey(uid, accountId));
  } catch {
    return null;
  }
}

function writeGuard(uid: string, a: Account, table: ExchangeRateTable): void {
  try {
    localStorage.setItem(guardKey(uid, a.id), guardValue(a, table));
  } catch {
    // sin localStorage: la idempotencia de dominio sigue protegiendo.
  }
}
