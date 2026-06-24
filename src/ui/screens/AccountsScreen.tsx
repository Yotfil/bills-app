import { useState } from 'react';
import { useUserCollection } from '../hooks/useUserCollection';
import { useFixedMonthly } from '../hooks/useFixedMonthly';
import { useSessionStore } from '../../store/sessionStore';
import { AccountForm } from './AccountForm';
import { ReconcileModal } from './ReconcileModal';
import { formatCop } from '../../lib/currency';
import { accountAvailable, accountReserved } from '../../domain/derived';
import { currentMonthKey } from '../../lib/date';
import { archiveAccount, subscribeAccounts } from '../../data/accountRepository';
import type { AccountsScreenProps } from './AccountsScreenProps';
import type { Account, AccountType } from '../../domain/types';

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
  const [editing, setEditing] = useState<Account | null>(null);
  const [reconciling, setReconciling] = useState<Account | null>(null);
  const [creating, setCreating] = useState(false);

  const accounts = items
    .filter((a) => !a.archived && (a.savingsBucket ?? false) === savingsBucket)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const title = savingsBucket ? 'Ahorros' : 'Cuentas';
  // Reservado = fijos del mes actual en estado 'allocated' asignados a cada cuenta (§5.1, §5.2).
  const { items: monthlyFixeds } = useFixedMonthly(currentMonthKey());

  async function handleArchive(account: Account) {
    if (!uid) return;
    if (!confirm(`¿Archivar la cuenta "${account.name}"? Su histórico se conserva.`)) return;
    await archiveAccount(uid, account.id);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
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
          const reserved = accountReserved(monthlyFixeds, account.id);
          const available = accountAvailable(account, monthlyFixeds);
          return (
            <li key={account.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{account.name}</p>
                  <p className="text-xs text-slate-400">{TYPE_LABEL[account.type]}</p>
                </div>
                <div className="flex gap-2 text-sm">
                  <button
                    type="button"
                    onClick={() => setEditing(account)}
                    className="text-slate-500 underline"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleArchive(account)}
                    className="text-slate-400 underline"
                  >
                    Archivar
                  </button>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <dt className="text-xs text-slate-400">Saldo</dt>
                  <dd className="text-sm font-medium text-slate-800">
                    {formatCop(account.cachedBalance)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Reservado</dt>
                  <dd className="text-sm font-medium text-amber-600">{formatCop(reserved)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Disponible</dt>
                  <dd className="text-sm font-semibold text-emerald-600">{formatCop(available)}</dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={() => setReconciling(account)}
                className="mt-3 w-full rounded-lg border border-slate-200 py-2 text-sm text-slate-500"
              >
                Reconciliar saldo
              </button>
            </li>
          );
        })}
      </ul>

      <AccountForm
        open={creating}
        defaultSavingsBucket={savingsBucket}
        onClose={() => setCreating(false)}
      />
      <AccountForm open={!!editing} account={editing} onClose={() => setEditing(null)} />
      <ReconcileModal
        open={!!reconciling}
        account={reconciling}
        onClose={() => setReconciling(null)}
      />
    </div>
  );
}
