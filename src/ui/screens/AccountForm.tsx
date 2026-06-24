import { useState, type FormEvent } from 'react';
import { Modal } from '../components/Modal';
import { useSessionStore } from '../../store/sessionStore';
import { createAccount, updateAccount } from '../../data/accountRepository';
import type { AccountFormProps } from './AccountFormProps';
import type { AccountType } from '../../domain/types';

// Formulario para crear/editar una cuenta (CLAUDE.md §8.4). El saldo no se edita aquí: se
// corrige reconciliando (§5.7).
export function AccountForm({ open, account, onClose }: AccountFormProps) {
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
