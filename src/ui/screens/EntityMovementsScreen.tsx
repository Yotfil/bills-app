import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useUserCollection } from '../hooks/useUserCollection';
import { useUsdRateTable } from '../hooks/useUsdRateTable';
import { useSessionStore } from '../../store/sessionStore';
import { BackButton } from '../components/BackButton';
import { MonthSelector } from '../components/MonthSelector';
import { TransactionList } from '../components/TransactionList';
import { Modal } from '../components/Modal';
import { TransactionForm } from './TransactionForm';
import { formatCop, formatForeignAmount } from '../../lib/currency';
import {
  addMonths,
  currentMonthKey,
  dayEndMillis,
  dayStartMillis,
  formatMonthLabel,
} from '../../lib/date';
import { accountBalanceCop } from '../../domain/foreignBalance';
import { EMPTY_TRANSACTION_FILTER, filterTransactions } from '../../domain/transactionFilters';
import { subscribeTransactions } from '../../data/transactionRepository';
import { subscribeAccounts } from '../../data/accountRepository';
import { subscribeCards } from '../../data/cardRepository';
import { subscribeLoans } from '../../data/loanRepository';
import { subscribeCategories } from '../../data/categoryRepository';
import { deleteTransaction } from '../../data/transactionService';
import type { EntityMovementsScreenProps } from './EntityMovementsScreenProps';
import type { Account, Category, CreditCard, Loan, Transaction } from '../../domain/types';

// Movimientos que componen el saldo de una cuenta o la deuda de una tarjeta (§8.2 aplicado a
// una sola entidad). Por defecto muestra el mes en curso; se puede navegar a meses anteriores
// con las flechas o filtrar por un rango de fechas específico. Reusa la lógica pura
// `filterTransactions` (fija la entidad como origen o destino) y la vista `TransactionList`.
export function EntityMovementsScreen({ kind }: EntityMovementsScreenProps) {
  const uid = useSessionStore((s) => s.user?.uid);
  const { id = '' } = useParams();
  const { items: transactions } = useUserCollection<Transaction>(subscribeTransactions);
  const { items: accounts } = useUserCollection<Account>(subscribeAccounts);
  const { items: cards } = useUserCollection<CreditCard>(subscribeCards);
  const { items: loans } = useUserCollection<Loan>(subscribeLoans);
  const { items: categories } = useUserCollection<Category>(subscribeCategories);
  const { table } = useUsdRateTable();

  const [month, setMonth] = useState(currentMonthKey());
  const [customRange, setCustomRange] = useState(false);
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const [editing, setEditing] = useState<Transaction | null>(null);

  const account = kind === 'account' ? accounts.find((a) => a.id === id) : undefined;
  const card = kind === 'card' ? cards.find((c) => c.id === id) : undefined;
  const entity = account ?? card;

  // El filtro fija la entidad (origen o destino) y acota por mes o por rango de fechas.
  const filter = useMemo(() => {
    const base = { ...EMPTY_TRANSACTION_FILTER, entityKey: `${kind}:${id}` };
    if (customRange) {
      return {
        ...base,
        fromMillis: fromInput ? dayStartMillis(fromInput) : null,
        toMillis: toInput ? dayEndMillis(toInput) : null,
      };
    }
    // Mes en curso: [primer día 00:00, último ms del mes]. La cota superior es el inicio del
    // mes siguiente menos 1 ms (inclusiva de todo el mes elegido).
    return {
      ...base,
      fromMillis: dayStartMillis(`${month}-01`),
      toMillis: dayStartMillis(`${addMonths(month, 1)}-01`) - 1,
    };
  }, [kind, id, customRange, fromInput, toInput, month]);

  const visible = useMemo(
    () => filterTransactions(transactions, filter),
    [transactions, filter],
  );

  // Volver a la lista de origen (Ahorros para las bolsas de ahorro; si no, Cuentas o Tarjetas).
  const back =
    kind === 'card'
      ? { to: '/mas/tarjetas', label: 'Volver a Tarjetas' }
      : account?.savingsBucket
        ? { to: '/mas/ahorros', label: 'Volver a Ahorros' }
        : { to: '/mas/cuentas', label: 'Volver a Cuentas' };

  async function handleDelete(txn: Transaction) {
    if (!uid) return;
    if (!confirm('¿Eliminar este movimiento? Se revertirá su efecto en los saldos.')) return;
    await deleteTransaction(uid, txn.id);
    setEditing(null);
  }

  function enableCustomRange() {
    setCustomRange(true);
  }

  function backToMonth() {
    setCustomRange(false);
    setFromInput('');
    setToInput('');
    setMonth(currentMonthKey());
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
      <BackButton to={back.to} label={back.label} />

      {entity && (
        <header className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="font-semibold text-slate-800">{entity.name}</p>
          {account ? (
            <p className="mt-1 text-sm text-slate-500">
              Saldo:{' '}
              <span className="font-medium text-slate-800">
                {account.foreignCurrency ? '≈ ' : ''}
                {formatCop(accountBalanceCop(account, table))}
              </span>
              {account.foreignCurrency && account.foreignAmount != null && (
                <span className="text-slate-400">
                  {' '}
                  · {formatForeignAmount(account.foreignAmount)} {account.foreignCurrency}
                </span>
              )}
            </p>
          ) : card ? (
            <p className="mt-1 text-sm text-slate-500">
              Deuda: <span className="font-medium text-red-600">{formatCop(card.cachedDebt)}</span>
            </p>
          ) : null}
        </header>
      )}

      {/* Selector de periodo: mes en curso por defecto (flechas para meses anteriores) o un
          rango de fechas específico. */}
      <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3">
        {customRange ? (
          <>
            <div className="flex gap-3">
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-xs text-slate-400">Desde</span>
                <input
                  type="date"
                  value={fromInput}
                  onChange={(e) => setFromInput(e.target.value)}
                  className="rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-slate-500"
                />
              </label>
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-xs text-slate-400">Hasta</span>
                <input
                  type="date"
                  value={toInput}
                  onChange={(e) => setToInput(e.target.value)}
                  className="rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-slate-500"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={backToMonth}
              className="w-fit text-sm text-slate-500 underline"
            >
              Ver por mes
            </button>
          </>
        ) : (
          <>
            <MonthSelector
              month={month}
              onPrev={() => setMonth((m) => addMonths(m, -1))}
              onNext={() => setMonth((m) => addMonths(m, 1))}
            />
            <button
              type="button"
              onClick={enableCustomRange}
              className="w-fit text-sm text-slate-500 underline"
            >
              Filtrar por fechas
            </button>
          </>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="text-slate-500">
          {customRange
            ? 'No hay movimientos en el rango de fechas elegido.'
            : `No hay movimientos en ${formatMonthLabel(month)}.`}
        </p>
      ) : (
        <p className="px-1 text-xs text-slate-400">
          {visible.length} {visible.length === 1 ? 'movimiento' : 'movimientos'}
          {!customRange && (
            <>
              {' · '}
              <span className="capitalize">{formatMonthLabel(month)}</span>
            </>
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
