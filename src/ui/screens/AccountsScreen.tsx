import { useState } from 'react';
import { useUserCollection } from '../hooks/useUserCollection';
import { useSessionStore } from '../../store/sessionStore';
import { AccountForm } from './AccountForm';
import { ReconcileModal } from './ReconcileModal';
import { ReservedBreakdownModal } from './ReservedBreakdownModal';
import { BackButton } from '../components/BackButton';
import { Pencil, Scale, Archive, Trash2 } from 'lucide-react';
import { ActionMenu } from '../components/ActionMenu';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { formatCop, formatCopPlain } from '../../lib/currency';
import { accountAvailable, accountReserved } from '../../domain/derived';
import { entityHasMovements } from '../../domain/entityUsage';
import { archiveAccount, deleteAccount, subscribeAccounts } from '../../data/accountRepository';
import { markFixedPending, subscribeAllocatedFixeds } from '../../data/fixedMonthlyRepository';
import { subscribeTransactions } from '../../data/transactionRepository';
import { reconcileAccount } from '../../data/reconciliationService';
import type { AccountsScreenProps } from './AccountsScreenProps';
import type { ReconcileTarget } from './ReconcileTarget';
import type {
  Account,
  AccountType,
  FixedObligationMonthly,
  Transaction,
} from '../../domain/types';

const TYPE_LABEL: Record<AccountType, string> = {
  savings: 'Ahorros',
  cash: 'Efectivo',
  term_deposit: 'CDT / Inversión',
};

// Sirve dos secciones (§8.4): "Cuentas" (uso/gasto) y "Ahorros" (bolsas apartadas), según
// el flag savingsBucket. El disponible real solo cuenta las de uso (§4).
export function AccountsScreen({ savingsBucket = false }: AccountsScreenProps) {
  const uid = useSessionStore((s) => s.user?.uid);
  const { items, loading } = useUserCollection<Account>(subscribeAccounts);
  const { items: transactions } = useUserCollection<Transaction>(subscribeTransactions);
  const [editing, setEditing] = useState<Account | null>(null);
  const [reconciling, setReconciling] = useState<Account | null>(null);
  const [reservedFor, setReservedFor] = useState<Account | null>(null);
  const [deleting, setDeleting] = useState<Account | null>(null);
  const [creating, setCreating] = useState(false);

  const accounts = items
    .filter((a) => !a.archived && (a.savingsBucket ?? false) === savingsBucket)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const title = savingsBucket ? 'Ahorros' : 'Cuentas';
  // Reservado = TODO lo destinado y no pagado (cualquier mes) asignado a cada cuenta (§5.1, §5.2).
  const { items: allocatedFixeds } =
    useUserCollection<FixedObligationMonthly>(subscribeAllocatedFixeds);

  async function handleArchive(account: Account) {
    if (!uid) return;
    if (!confirm(`¿Archivar la cuenta "${account.name}"? Su histórico se conserva.`)) return;
    await archiveAccount(uid, account.id);
  }

  // El borrado físico solo procede si la cuenta NO tiene movimientos (§8.4); si los tiene, el
  // popup bloquea y ofrece archivar.
  const deletingBlocked = deleting
    ? entityHasMovements(transactions, 'account', deleting.id)
    : false;

  async function handleDelete() {
    if (!uid || !deleting) return;
    await deleteAccount(uid, deleting.id);
    setDeleting(null);
  }

  async function handleArchiveFromModal() {
    if (!uid || !deleting) return;
    await archiveAccount(uid, deleting.id);
    setDeleting(null);
  }

  const reconcileTarget: ReconcileTarget | null =
    reconciling && uid
      ? {
          id: reconciling.id,
          name: reconciling.name,
          registeredValue: reconciling.cachedBalance,
          registeredLabel: 'Saldo registrado',
          inputLabel: 'Saldo real de la cuenta (COP)',
          goodDirection: 'increase', // más saldo = verde
          reconcile: (real, note) => reconcileAccount(uid, reconciling, real, note),
        }
      : null;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
      <BackButton />
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">{title}</h1>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white"
        >
          + Nueva
        </button>
      </header>

      {loading && <p className="text-slate-400">Cargando…</p>}
      {!loading && accounts.length === 0 && (
        <p className="text-slate-500">
          {savingsBucket
            ? 'Aún no tienes bolsas de ahorro. Crea una o marca una cuenta como ahorro.'
            : 'Aún no tienes cuentas. Crea la primera.'}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {accounts.map((account) => {
          const reserved = accountReserved(allocatedFixeds, account.id);
          const available = accountAvailable(account, allocatedFixeds);
          return (
            <li key={account.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-800">{account.name}</p>
                  <p className="text-xs text-slate-400">{TYPE_LABEL[account.type]}</p>
                </div>
                <ActionMenu
                  ariaLabel={`Acciones de ${account.name}`}
                  items={[
                    { label: 'Editar', icon: Pencil, onSelect: () => setEditing(account) },
                    { label: 'Reconciliar', icon: Scale, onSelect: () => setReconciling(account) },
                    { label: 'Archivar', icon: Archive, onSelect: () => handleArchive(account) },
                    {
                      label: 'Eliminar',
                      icon: Trash2,
                      onSelect: () => setDeleting(account),
                      danger: true,
                    },
                  ]}
                />
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <dt className="text-xs text-slate-400">Saldo</dt>
                  <dd className="text-sm font-medium text-slate-800">
                    {formatCop(account.cachedBalance)}
                  </dd>
                  {account.foreignCurrency && account.foreignAmount != null && (
                    <dd className="text-[11px] text-slate-400">
                      ≈ {formatCopPlain(account.foreignAmount)} {account.foreignCurrency}
                    </dd>
                  )}
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Reservado</dt>
                  {/* Si hay reservado, se puede tocar para ver QUÉ fijos lo apartan y deshacerlos. */}
                  {reserved > 0 ? (
                    <dd>
                      <button
                        type="button"
                        onClick={() => setReservedFor(account)}
                        className="text-sm font-medium text-amber-600 underline"
                      >
                        {formatCop(reserved)}
                      </button>
                    </dd>
                  ) : (
                    <dd className="text-sm font-medium text-amber-600">{formatCop(reserved)}</dd>
                  )}
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Disponible</dt>
                  <dd className="text-sm font-semibold text-emerald-600">{formatCop(available)}</dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ul>

      <AccountForm
        key={`create-${creating}`}
        open={creating}
        defaultSavingsBucket={savingsBucket}
        onClose={() => setCreating(false)}
      />
      <AccountForm
        key={editing?.id ?? 'edit-none'}
        open={!!editing}
        account={editing}
        onClose={() => setEditing(null)}
      />
      <ReconcileModal
        open={!!reconciling}
        target={reconcileTarget}
        onClose={() => setReconciling(null)}
      />
      <ReservedBreakdownModal
        open={!!reservedFor}
        accountName={reservedFor?.name ?? ''}
        items={
          reservedFor
            ? allocatedFixeds.filter(
                (f) =>
                  !f.budgetBacked &&
                  f.paymentMethod.kind === 'account' &&
                  f.paymentMethod.id === reservedFor.id,
              )
            : []
        }
        onUndestine={(fixed) => uid && markFixedPending(uid, fixed.id)}
        onClose={() => setReservedFor(null)}
      />
      <ConfirmDeleteModal
        open={!!deleting}
        itemLabel={deleting?.name ?? ''}
        itemKind={savingsBucket ? 'la bolsa de ahorro' : 'la cuenta'}
        blocked={deletingBlocked}
        onConfirm={() => void handleDelete()}
        onArchive={() => void handleArchiveFromModal()}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
