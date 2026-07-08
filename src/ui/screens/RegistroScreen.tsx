import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUserCollection } from '../hooks/useUserCollection';
import { useSessionStore } from '../../store/sessionStore';
import { Modal } from '../components/Modal';
import { DisponibleRealBar } from '../components/DisponibleRealBar';
import { TransactionList } from '../components/TransactionList';
import { TransactionForm } from './TransactionForm';
import { TransactionFilters } from './TransactionFilters';
import { subscribeTransactions } from '../../data/transactionRepository';
import { subscribeAccounts } from '../../data/accountRepository';
import { subscribeCards } from '../../data/cardRepository';
import { subscribeLoans } from '../../data/loanRepository';
import { subscribeCategories } from '../../data/categoryRepository';
import { deleteTransaction } from '../../data/transactionService';
import {
  EMPTY_TRANSACTION_FILTER,
  filterTransactions,
  isFilterActive,
} from '../../domain/transactionFilters';
import type { TransactionFilter } from '../../domain/transactionFilters';
import type { Account, Category, CreditCard, Loan, Transaction } from '../../domain/types';

export function RegistroScreen() {
  const uid = useSessionStore((s) => s.user?.uid);
  const { items: transactions, loading } = useUserCollection<Transaction>(subscribeTransactions);
  const { items: accounts } = useUserCollection<Account>(subscribeAccounts);
  const { items: cards } = useUserCollection<CreditCard>(subscribeCards);
  const { items: loans } = useUserCollection<Loan>(subscribeLoans);
  const { items: categories } = useUserCollection<Category>(subscribeCategories);
  const [editing, setEditing] = useState<Transaction | null>(null);

  // El filtro (§8.2) arranca con la categoría que llega desde la dona del dashboard (§8.1).
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useState<TransactionFilter>(() => ({
    ...EMPTY_TRANSACTION_FILTER,
    categoryId: searchParams.get('cat'),
  }));

  const visible = useMemo(
    () => filterTransactions(transactions, filter),
    [transactions, filter],
  );

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

      {transactions.length > 0 && (
        <TransactionFilters
          filter={filter}
          onChange={setFilter}
          categories={categories}
          accounts={accounts}
          cards={cards}
          loans={loans}
        />
      )}

      {loading && <p className="text-slate-400">Cargando…</p>}
      {!loading && transactions.length === 0 && (
        <p className="text-slate-500">
          Aún no hay movimientos. Toca “+” para registrar el primero.
        </p>
      )}
      {!loading && transactions.length > 0 && visible.length === 0 && (
        <p className="text-slate-500">
          Ningún movimiento coincide con el filtro.{' '}
          {isFilterActive(filter) && (
            <button
              type="button"
              onClick={() => setFilter(EMPTY_TRANSACTION_FILTER)}
              className="font-medium text-slate-700 underline"
            >
              Limpiar
            </button>
          )}
        </p>
      )}

      <TransactionList
        transactions={visible}
        categories={categories}
        accounts={accounts}
        cards={cards}
        loans={loans}
        onSelect={setEditing}
      />

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
