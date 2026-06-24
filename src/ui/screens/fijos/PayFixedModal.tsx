import { useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { SelectField } from '../../components/SelectField';
import { MoneyInput } from '../../components/MoneyInput';
import { formatCop } from '../../../lib/currency';
import { refToValue, valueToRef } from '../../../lib/entityRef';
import type { PayFixedModalProps } from './PayFixedModalProps';

// Confirmación de pago de un fijo (CLAUDE.md §5.3): monto prellenado pero EDITABLE (se guarda
// el real), medio de pago cambiable. Si es abono a deuda, va a la tarjeta destino del fijo.
export function PayFixedModal({
  open,
  fixed,
  accounts,
  cards,
  loans,
  onClose,
  onConfirm,
}: PayFixedModalProps) {
  if (!fixed) return null;
  return (
    <Modal open={open} title={`Pagar: ${fixed.name}`} onClose={onClose}>
      <PayFixedForm
        key={fixed.id}
        fixed={fixed}
        accounts={accounts}
        cards={cards}
        loans={loans}
        onConfirm={onConfirm}
        onClose={onClose}
      />
    </Modal>
  );
}

type PayFixedFormProps = Omit<PayFixedModalProps, 'open'> & {
  fixed: NonNullable<PayFixedModalProps['fixed']>;
};

function PayFixedForm({ fixed, accounts, cards, loans, onConfirm, onClose }: PayFixedFormProps) {
  const isDebtPayment = fixed.payKind === 'debt_payment';
  const [amount, setAmount] = useState(String(fixed.budgetedAmount));
  const [source, setSource] = useState(refToValue(fixed.paymentMethod));
  const [busy, setBusy] = useState(false);

  // En abono a deuda el origen es una cuenta; en gasto puede ser cuenta o tarjeta.
  const sourceOptions = [
    ...accounts.map((a) => ({ value: refToValue({ kind: 'account', id: a.id }), label: a.name })),
    ...(isDebtPayment
      ? []
      : cards.map((c) => ({
          value: refToValue({ kind: 'card', id: c.id }),
          label: `${c.name} (TC)`,
        }))),
  ];

  // El destino del abono es la tarjeta o el crédito del fijo (resolvemos el kind por el id).
  const targetCard = isDebtPayment ? cards.find((c) => c.id === fixed.debtTargetId) : undefined;
  const targetLoan = isDebtPayment ? loans.find((l) => l.id === fixed.debtTargetId) : undefined;
  const targetName = targetCard?.name ?? targetLoan?.name;
  const debtTarget = targetCard
    ? ({ kind: 'card', id: targetCard.id } as const)
    : targetLoan
      ? ({ kind: 'loan', id: targetLoan.id } as const)
      : null;
  const debtTargetMissing = isDebtPayment && !debtTarget;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const paymentMethod = valueToRef(source);
    if (!paymentMethod || debtTargetMissing) return;
    setBusy(true);
    try {
      await onConfirm({
        amount: Math.round(Number(amount) || 0),
        paymentMethod,
        debtTarget,
      });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">Monto real (COP)</span>
        <MoneyInput
          autoFocus
          value={amount}
          onChange={setAmount}
          className="rounded-xl border border-slate-300 px-4 py-3 text-lg font-semibold outline-none focus:border-slate-500"
        />
        <span className="text-xs text-slate-400">
          Presupuestado: {formatCop(fixed.budgetedAmount)}
        </span>
      </label>

      <SelectField
        label={isDebtPayment ? 'Abonar desde' : 'Medio de pago'}
        value={source}
        onChange={setSource}
        options={sourceOptions}
        placeholder="Selecciona…"
      />

      {isDebtPayment && targetName && (
        <p className="text-xs text-slate-400">Abona a: {targetName}</p>
      )}
      {debtTargetMissing && (
        <p className="text-sm text-red-600">
          La deuda destino de este fijo no es una tarjeta ni crédito registrado. No se puede pagar
          todavía.
        </p>
      )}

      <button
        type="submit"
        disabled={busy || debtTargetMissing}
        className="rounded-xl bg-slate-800 py-3 font-medium text-white disabled:opacity-50"
      >
        Confirmar pago
      </button>
    </form>
  );
}
