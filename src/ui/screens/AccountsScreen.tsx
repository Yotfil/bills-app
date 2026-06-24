import { useState, type FormEvent } from 'react';
import { useUserCollection } from '../hooks/useUserCollection';
import { useSessionStore } from '../../store/sessionStore';
import { Modal } from '../components/Modal';
import { formatCop } from '../../lib/currency';
import { accountAvailable, accountReserved } from '../../domain/derived';
import {
  archiveAccount,
  createAccount,
  subscribeAccounts,
  updateAccount,
} from '../../data/accountRepository';
import type { Account, AccountType, FixedObligationMonthly } from '../../domain/types';

const TYPE_LABEL: Record<AccountType, string> = {
  savings: 'Ahorros',
  cash: 'Efectivo',
  term_deposit: 'CDT / Inversión',
};

export function AccountsScreen() {
  const uid = useSessionStore((s) => s.user?.uid);
  const { items, loading } = useUserCollection<Account>(subscribeAccounts);
  const [editing, setEditing] = useState<Account | null>(null);
  const [creating, setCreating] = useState(false);

  const accounts = items.filter((a) => !a.archived).sort((a, b) => a.sortOrder - b.sortOrder);
  // El reservado real saldrá de los fijos del mes (§5.2); aún no hay fijos → 0.
  const monthlyFixeds: FixedObligationMonthly[] = [];

  async function handleArchive(account: Account) {
    if (!uid) return;
    if (!confirm(`¿Archivar la cuenta "${account.name}"? Su histórico se conserva.`)) return;
    await archiveAccount(uid, account.id);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Cuentas</h1>
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
        <p className="text-slate-500">Aún no tienes cuentas. Crea la primera.</p>
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
            </li>
          );
        })}
      </ul>

      <AccountForm open={creating} onClose={() => setCreating(false)} />
      <AccountForm open={!!editing} account={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

interface AccountFormProps {
  open: boolean;
  account?: Account | null;
  onClose: () => void;
}

function AccountForm({ open, account, onClose }: AccountFormProps) {
  const uid = useSessionStore((s) => s.user?.uid);
  const isEdit = !!account;
  const [name, setName] = useState(account?.name ?? '');
  const [type, setType] = useState<AccountType>(account?.type ?? 'savings');
  const [initialBalance, setInitialBalance] = useState(String(account?.initialBalance ?? ''));
  const [busy, setBusy] = useState(false);

  // Reinicia el formulario cada vez que se abre con otra cuenta (o para crear).
  const formKey = account?.id ?? 'new';

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!uid || !name.trim()) return;
    setBusy(true);
    try {
      if (isEdit && account) {
        await updateAccount(uid, account.id, { name: name.trim(), type });
      } else {
        await createAccount(uid, {
          name,
          type,
          initialBalance: Math.round(Number(initialBalance) || 0),
        });
      }
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title={isEdit ? 'Editar cuenta' : 'Nueva cuenta'} onClose={onClose}>
      <form key={formKey} onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          autoFocus
          placeholder="Nombre (p.ej. Bancolombia)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as AccountType)}
          className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
        >
          <option value="savings">Ahorros</option>
          <option value="cash">Efectivo</option>
          <option value="term_deposit">CDT / Inversión</option>
        </select>
        {!isEdit && (
          <input
            type="number"
            inputMode="numeric"
            placeholder="Saldo inicial (COP)"
            value={initialBalance}
            onChange={(e) => setInitialBalance(e.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
          />
        )}
        {isEdit && (
          <p className="text-xs text-slate-400">
            El saldo no se edita aquí: se corrige reconciliando la cuenta (§5.7).
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-slate-800 py-3 font-medium text-white disabled:opacity-50"
        >
          {isEdit ? 'Guardar' : 'Crear cuenta'}
        </button>
      </form>
    </Modal>
  );
}
