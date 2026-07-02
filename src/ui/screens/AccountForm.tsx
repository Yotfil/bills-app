import { useState, type FormEvent } from 'react';
import { Modal } from '../components/Modal';
import { MoneyInput } from '../components/MoneyInput';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { useSessionStore } from '../../store/sessionStore';
import { createAccount, updateAccount } from '../../data/accountRepository';
import type { AccountFormProps } from './AccountFormProps';
import type { AccountType } from '../../domain/types';

// Formulario para crear/editar una cuenta (CLAUDE.md §8.4). El saldo no se edita aquí: se
// corrige reconciliando (§5.7).
export function AccountForm({ open, account, defaultSavingsBucket, onClose }: AccountFormProps) {
  const uid = useSessionStore((s) => s.user?.uid);
  const isEdit = !!account;
  const [name, setName] = useState(account?.name ?? '');
  const [type, setType] = useState<AccountType>(account?.type ?? 'savings');
  const [initialBalance, setInitialBalance] = useState(String(account?.initialBalance ?? ''));
  const [savingsBucket, setSavingsBucket] = useState(
    account?.savingsBucket ?? defaultSavingsBucket ?? false,
  );
  const [foreignCurrency, setForeignCurrency] = useState(account?.foreignCurrency ?? '');
  const [foreignAmount, setForeignAmount] = useState(
    account?.foreignAmount != null ? String(account.foreignAmount) : '',
  );
  const { busy, error, run } = useAsyncAction();

  // Reinicia el formulario cada vez que se abre con otra cuenta (o para crear).
  const formKey = account?.id ?? 'new';

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!uid || !name.trim()) return;
    const currency = foreignCurrency.trim().toUpperCase() || null;
    const fAmount = currency && foreignAmount ? Math.round(Number(foreignAmount) || 0) : null;
    const ok = await run(async () => {
      if (isEdit && account) {
        await updateAccount(uid, account.id, {
          name: name.trim(),
          type,
          savingsBucket,
          foreignCurrency: currency,
          foreignAmount: fAmount,
        });
      } else {
        await createAccount(uid, {
          name,
          type,
          initialBalance: Math.round(Number(initialBalance) || 0),
          savingsBucket,
          foreignCurrency: currency,
          foreignAmount: fAmount,
        });
      }
    });
    if (ok) onClose();
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
          <MoneyInput
            placeholder="Saldo inicial (COP)"
            value={initialBalance}
            onChange={setInitialBalance}
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
          />
        )}
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={savingsBucket}
            onChange={(e) => setSavingsBucket(e.target.checked)}
          />
          Es una bolsa de ahorro (no cuenta en el disponible)
        </label>

        {/* Moneda extranjera (opcional): el saldo se lleva en COP; esto es solo referencia. */}
        <div className="flex gap-2">
          <input
            placeholder="Moneda"
            value={foreignCurrency}
            onChange={(e) => setForeignCurrency(e.target.value)}
            className="w-24 rounded-xl border border-slate-300 px-3 py-3 uppercase outline-none focus:border-slate-500"
          />
          <MoneyInput
            placeholder="Monto"
            value={foreignAmount}
            onChange={setForeignAmount}
            className="flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
          />
        </div>
        <p className="text-xs text-slate-400">
          Opcional. Si la cuenta está en otra moneda (p.ej. USD), anótala aquí solo como referencia:
          la app sigue en pesos y <span className="font-medium">no convierte nada</span>. Verás una
          nota tipo «≈ 9.918 USD» bajo el saldo en COP.
        </p>
        {isEdit && (
          <p className="text-xs text-slate-400">
            El saldo no se edita aquí: se corrige reconciliando la cuenta (§5.7).
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
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
