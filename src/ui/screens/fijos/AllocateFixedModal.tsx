import { useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { SelectField } from '../../components/SelectField';
import { formatCop } from '../../../lib/currency';
import { refToValue, valueToRef } from '../../../lib/entityRef';
import { accountAvailable } from '../../../domain/derived';
import type { AllocateFixedModalProps } from './AllocateFixedModalProps';

// Destinar un fijo (CLAUDE.md §5.2): el usuario elige de QUÉ CUENTA se reserva el dinero. No mueve
// saldo; solo aparta el monto presupuestado (baja el disponible de esa cuenta y el disponible real).
// Solo cuentas: el "reservado" aparta efectivo en una cuenta; una tarjeta de crédito no tiene efectivo
// que reservar (§5.1, derived.accountReserved).
export function AllocateFixedModal({
  open,
  fixed,
  accounts,
  monthlyFixeds,
  onClose,
  onConfirm,
}: AllocateFixedModalProps) {
  if (!fixed) return null;
  return (
    <Modal open={open} title={`Destinar: ${fixed.name}`} onClose={onClose}>
      <AllocateFixedForm
        key={fixed.id}
        fixed={fixed}
        accounts={accounts}
        monthlyFixeds={monthlyFixeds}
        onConfirm={onConfirm}
        onClose={onClose}
      />
    </Modal>
  );
}

type AllocateFixedFormProps = Omit<AllocateFixedModalProps, 'open'> & {
  fixed: NonNullable<AllocateFixedModalProps['fixed']>;
};

function AllocateFixedForm({
  fixed,
  accounts,
  monthlyFixeds,
  onConfirm,
  onClose,
}: AllocateFixedFormProps) {
  // Solo cuentas COP: los fijos son COP y no se pagan desde cuentas en divisa, así que tampoco
  // se reserva en ellas (decisión 2026-07-09; su reservado es siempre 0).
  const copAccounts = accounts.filter((a) => !a.foreignCurrency);
  const options = copAccounts.map((a) => ({
    value: refToValue({ kind: 'account', id: a.id }),
    label: a.name,
  }));

  // Prellena con la cuenta por defecto del fijo si es una cuenta VÁLIDA (COP); si no, la primera.
  const fixedDefault =
    fixed.paymentMethod.kind === 'account' ? refToValue(fixed.paymentMethod) : '';
  const defaultValue = options.some((o) => o.value === fixedDefault)
    ? fixedDefault
    : (options[0]?.value ?? '');
  const [source, setSource] = useState(defaultValue);
  const [busy, setBusy] = useState(false);

  // Vista previa del efecto sobre la cuenta elegida: disponible actual y cómo queda tras reservar.
  // Se pasa `table = null`: aquí solo se destina a cuentas COP (las de divisa se excluyen), donde
  // el fallback a cachedBalance es exacto — no hace falta cargar la tasa en el modal.
  const selectedAccount = copAccounts.find(
    (a) => refToValue({ kind: 'account', id: a.id }) === source,
  );
  const currentAvailable = selectedAccount
    ? accountAvailable(selectedAccount, monthlyFixeds, null)
    : null;
  const afterAvailable =
    currentAvailable === null ? null : currentAvailable - fixed.budgetedAmount;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const account = valueToRef(source);
    if (!account) return;
    setBusy(true);
    try {
      await onConfirm(account);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="rounded-xl bg-slate-50 p-3 text-sm">
        <span className="text-slate-400">Monto a reservar</span>
        <p className="text-lg font-semibold text-slate-800">{formatCop(fixed.budgetedAmount)}</p>
      </div>

      {options.length === 0 ? (
        <p className="text-sm text-red-600">
          No tienes cuentas para destinar. Crea una cuenta primero.
        </p>
      ) : (
        <SelectField
          label="Reservar desde"
          value={source}
          onChange={setSource}
          options={options}
          placeholder="Selecciona una cuenta…"
        />
      )}

      {currentAvailable !== null && afterAvailable !== null && (
        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm">
          <span className="text-slate-400">Disponible tras destinar</span>
          <span className="text-right">
            <span className="block text-xs text-slate-400 line-through">
              {formatCop(currentAvailable)}
            </span>
            <span
              className={`font-semibold ${afterAvailable < 0 ? 'text-red-600' : 'text-slate-800'}`}
            >
              {formatCop(afterAvailable)}
            </span>
          </span>
        </div>
      )}

      <button
        type="submit"
        disabled={busy || !source}
        className="rounded-xl bg-slate-800 py-3 font-medium text-white disabled:opacity-50"
      >
        Destinar
      </button>
    </form>
  );
}
