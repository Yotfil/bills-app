import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUserCollection } from '../hooks/useUserCollection';
import { useSessionStore } from '../../store/sessionStore';
import { Modal } from '../components/Modal';
import { DisponibleRealBar } from '../components/DisponibleRealBar';
import { TransactionForm } from './TransactionForm';
import { formatCop } from '../../lib/currency';
import { dayKey, formatDayLabel } from '../../lib/date';
import { subscribeTransactions } from '../../data/transactionRepository';
import { subscribeAccounts } from '../../data/accountRepository';
import { subscribeCards } from '../../data/cardRepository';
import { subscribeLoans } from '../../data/loanRepository';
import { subscribeCategories } from '../../data/categoryRepository';
import { deleteTransaction } from '../../data/transactionService';
import { totalSpend } from '../../domain/reports';
import type {
  Account,
  Category,
  CreditCard,
  EntityRef,
  Loan,
  Transaction,
  TransactionType,
} from '../../domain/types';

// Color del monto según el tipo (§8.2): gasto baja (rojo), ingreso entra (verde), el resto
// es movimiento neutro.
const AMOUNT_CLASS: Record<TransactionType, string> = {
  expense: 'text-red-600',
  income: 'text-emerald-600',
  transfer: 'text-slate-500',
  debt_payment: 'text-slate-500',
  adjustment: 'text-slate-500',
};

const SIGN: Record<TransactionType, string> = {
  expense: '−',
  income: '+',
  transfer: '',
  debt_payment: '−',
  adjustment: '',
};

export function RegistroScreen() {
  const uid = useSessionStore((s) => s.user?.uid);
  const { items: transactions, loading } = useUserCollection<Transaction>(subscribeTransactions);
  const { items: accounts } = useUserCollection<Account>(subscribeAccounts);
  const { items: cards } = useUserCollection<CreditCard>(subscribeCards);
  const { items: loans } = useUserCollection<Loan>(subscribeLoans);
  const { items: categories } = useUserCollection<Category>(subscribeCategories);
  const [editing, setEditing] = useState<Transaction | null>(null);

  // Filtro por categoría que llega desde la dona del dashboard (§8.1, §8.2).
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryFilter = searchParams.get('cat');

  const entityName = useMemo(() => {
    const map = new Map<string, string>();
    accounts.forEach((a) => map.set(`account:${a.id}`, a.name));
    cards.forEach((c) => map.set(`card:${c.id}`, c.name));
    loans.forEach((l) => map.set(`loan:${l.id}`, l.name));
    return (ref: EntityRef | null) => (ref ? (map.get(`${ref.kind}:${ref.id}`) ?? '—') : '—');
  }, [accounts, cards, loans]);

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // Agrupar por día conservando el orden cronológico inverso que ya trae la consulta (§8.2).
  const groups = useMemo(() => {
    const visible = categoryFilter
      ? transactions.filter((t) => t.categoryId === categoryFilter)
      : transactions;
    const byDay = new Map<string, Transaction[]>();
    for (const txn of visible) {
      const key = dayKey(txn.date);
      const list = byDay.get(key) ?? [];
      list.push(txn);
      byDay.set(key, list);
    }
    return [...byDay.entries()];
  }, [transactions, categoryFilter]);

  async function handleDelete(txn: Transaction) {
    if (!uid) return;
    if (!confirm('¿Eliminar este movimiento? Se revertirá su efecto en los saldos.')) return;
    await deleteTransaction(uid, txn.id);
    setEditing(null);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
      <DisponibleRealBar />
      <h1 className="text-xl font-bold text-slate-800">Registro</h1>

      {categoryFilter && (
        <div className="flex items-center gap-2 text-sm">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
            Categoría: {categoryById.get(categoryFilter)?.name ?? categoryFilter}
          </span>
          <button
            type="button"
            onClick={() => setSearchParams({})}
            className="text-slate-400 underline"
          >
            Quitar filtro
          </button>
        </div>
      )}

      {loading && <p className="text-slate-400">Cargando…</p>}
      {!loading && transactions.length === 0 && (
        <p className="text-slate-500">
          Aún no hay movimientos. Toca “+” para registrar el primero.
        </p>
      )}

      {groups.map(([key, dayTxns]) => (
        <section key={key} className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold text-slate-400 uppercase">
              {formatDayLabel(dayTxns[0]!.date)}
            </h2>
            <span className="text-xs text-slate-400">Gastos: {formatCop(totalSpend(dayTxns))}</span>
          </div>
          <ul className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {dayTxns.map((txn) => {
              const cat = txn.categoryId ? categoryById.get(txn.categoryId) : undefined;
              const method = entityName(txn.source ?? txn.destination);
              return (
                <li key={txn.id}>
                  <button
                    type="button"
                    onClick={() => setEditing(txn)}
                    className="flex w-full items-center gap-3 border-b border-slate-100 px-3 py-3 text-left last:border-0"
                  >
                    <span className="text-xl">{cat?.icon ?? '↔️'}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-slate-800">
                        {txn.concept}
                        {txn.tags.includes('hormiga') && ' 🐜'}
                      </span>
                      <span className="block truncate text-xs text-slate-400">{method}</span>
                    </span>
                    <span className={`font-semibold ${AMOUNT_CLASS[txn.type]}`}>
                      {SIGN[txn.type]}
                      {formatCop(txn.amount)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <Modal open={!!editing} title="Editar movimiento" onClose={() => setEditing(null)}>
        {editing && (
          <div className="flex flex-col gap-4">
            <TransactionForm existing={editing} onDone={() => setEditing(null)} />
            <button
              type="button"
              onClick={() => handleDelete(editing)}
              className="rounded-xl border border-red-200 py-2.5 text-sm font-medium text-red-600"
            >
              Eliminar movimiento
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
