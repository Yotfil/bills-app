import { useState, type FormEvent } from 'react';
import { Modal } from '../components/Modal';
import { MoneyInput } from '../components/MoneyInput';
import { DecimalInput } from '../components/DecimalInput';
import { SelectField } from '../components/SelectField';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { useUsdRateTable } from '../hooks/useUsdRateTable';
import { useSessionStore } from '../../store/sessionStore';
import { createAccount, updateAccount } from '../../data/accountRepository';
import { convertToCop, listCurrencyCodes } from '../../domain/currencyConversion';
import { formatForeignAmount, parseDecimal } from '../../lib/currency';
import type { AccountFormProps } from './AccountFormProps';
import type { AccountType } from '../../domain/types';

// Formulario para crear/editar una cuenta (CLAUDE.md §8.4). El saldo no se edita aquí: se
// corrige reconciliando (§5.7). Si la cuenta vive en otra moneda (decisión 2026-07-05), la
// moneda se elige de las disponibles en la API de tasas y el saldo COP es el reflejo de la
// conversión: al crear se autollena con monto × tasa del día; al editar, la revaluación
// automática realinea el saldo.
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
  const { busy, error, setError, run } = useAsyncAction();
  const { table } = useUsdRateTable();

  // Monedas disponibles según la API (sin COP: COP = "sin divisa"). Si la cuenta ya tiene una
  // moneda que no está en la lista (p.ej. offline sin caché), se conserva como opción.
  const codes = table ? listCurrencyCodes(table).filter((c) => c !== 'COP') : [];
  const currencyOptions = (
    foreignCurrency && !codes.includes(foreignCurrency) ? [foreignCurrency, ...codes] : codes
  ).map((code) => ({ value: code, label: code }));

  const parsedForeign = foreignCurrency ? parseDecimal(foreignAmount) : null;
  // Saldo COP derivado del monto en divisa con la tasa del día (autollena el saldo inicial).
  const convertedCop =
    foreignCurrency && table && parsedForeign !== null
      ? convertToCop(parsedForeign, foreignCurrency, table)
      : null;

  // Reinicia el formulario cada vez que se abre con otra cuenta (o para crear).
  const formKey = account?.id ?? 'new';

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!uid || !name.trim()) return;
    const currency = foreignCurrency || null;
    if (!isEdit && currency && parsedForeign === null) {
      setError(`Ingresa el monto en ${currency}.`);
      return;
    }
    if (!isEdit && currency && convertedCop === null) {
      setError(`No hay tasa disponible para ${currency}. Revisa tu conexión e intenta de nuevo.`);
      return;
    }
    const ok = await run(async () => {
      if (isEdit && account) {
        // La moneda y el monto en divisa NO se editan aquí (misma regla que el saldo COP, §2):
        // el monto se corrige reconciliando y la moneda es parte de la identidad de la cuenta.
        await updateAccount(uid, account.id, {
          name: name.trim(),
          type,
          savingsBucket,
        });
      } else {
        await createAccount(uid, {
          name,
          type,
          // Con divisa, el saldo inicial COP es la conversión del monto (tasa del día).
          initialBalance: currency
            ? (convertedCop ?? 0)
            : Math.round(Number(initialBalance) || 0),
          savingsBucket,
          foreignCurrency: currency,
          foreignAmount: currency ? parsedForeign : null,
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

        {/* La moneda solo se elige al CREAR: cambiarla (o editar el monto en divisa) en una
            cuenta con historial rompería su ledger. En edición se muestra como dato fijo. */}
        {!isEdit && (
          <SelectField
            label="Moneda de la cuenta"
            value={foreignCurrency}
            onChange={setForeignCurrency}
            options={currencyOptions}
            placeholder="COP (pesos)"
          />
        )}

        {!isEdit && foreignCurrency && (
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Monto en {foreignCurrency}</span>
            <DecimalInput
              placeholder="p.ej. 12.782,50"
              value={foreignAmount}
              onChange={setForeignAmount}
              className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
            />
          </label>
        )}

        {isEdit && account?.foreignCurrency && (
          <div className="rounded-xl bg-slate-50 p-3 text-sm">
            <span className="text-slate-400">Cuenta en {account.foreignCurrency}</span>
            <p className="font-semibold text-slate-800">
              {formatForeignAmount(account.foreignAmount ?? 0)} {account.foreignCurrency}
            </p>
            <p className="text-xs text-slate-400">
              El monto en {account.foreignCurrency} se corrige reconciliando la cuenta (§5.7).
            </p>
          </div>
        )}

        {!isEdit && (
          <MoneyInput
            placeholder="Saldo inicial (COP)"
            value={foreignCurrency ? (convertedCop !== null ? String(convertedCop) : '') : initialBalance}
            onChange={setInitialBalance}
            disabled={!!foreignCurrency}
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500 disabled:bg-slate-100 disabled:text-slate-500"
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

        {foreignCurrency ? (
          <p className="text-xs text-slate-400">
            El monto en {foreignCurrency} es la fuente de verdad: el saldo en pesos{' '}
            <span className="font-medium">se calcula en vivo con la tasa del día</span>. Para
            corregirlo, reconcilia la cuenta en {foreignCurrency}.
          </p>
        ) : (
          <p className="text-xs text-slate-400">
            En COP el saldo se lleva en pesos, como siempre. Si la cuenta vive en otra moneda
            (p.ej. USD), elígela arriba y anota el monto en esa moneda.
          </p>
        )}
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
