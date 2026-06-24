import { useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { SelectField } from '../../components/SelectField';
import { useSessionStore } from '../../../store/sessionStore';
import { formatCop } from '../../../lib/currency';
import { refToValue, valueToRef } from '../../../lib/entityRef';
import { nowTimestamp } from '../../../lib/date';
import { buildManualTransactionDraft } from '../../../domain/transactionDraft';
import { createTransaction } from '../../../data/transactionService';
import type { PayLoanModalProps } from './PayLoanModalProps';

// Pagar una cuota / abonar a un crédito (CLAUDE.md §5.6): es un debt_payment que baja la
// cuenta origen y baja el saldo del crédito (no cuenta como gasto, §5.4).
export function PayLoanModal({ open, loan, accounts, onClose }: PayLoanModalProps) {
  if (!loan) return null;
  return (
    <Modal open={open} title={`Abonar a: ${loan.name}`} onClose={onClose}>
      <PayLoanForm key={loan.id} loan={loan} accounts={accounts} onClose={onClose} />
    </Modal>
  );
}

function PayLoanForm({
  loan,
  accounts,
  onClose,
}: {
  loan: NonNullable<PayLoanModalProps['loan']>;
  accounts: PayLoanModalProps['accounts'];
  onClose: () => void;
}) {
  const uid = useSessionStore((s) => s.user?.uid);
  const [amount, setAmount] = useState(String(loan.monthlyPayment));
  const [source, setSource] = useState('');
  const [busy, setBusy] = useState(false);

  const options = accounts.map((a) => ({
    value: refToValue({ kind: 'account', id: a.id }),
    label: a.name,
  }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const sourceRef = valueToRef(source);
    if (!uid || !sourceRef) return;
    setBusy(true);
    try {
      const draft = buildManualTransactionDraft({
        type: 'debt_payment',
        amount: Math.round(Number(amount) || 0),
        date: nowTimestamp(),
        concept: `Abono ${loan.name}`,
        categoryId: null,
        source: sourceRef,
        destination: { kind: 'loan', id: loan.id },
      });
      await createTransaction(uid, draft);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">Monto del abono (COP)</span>
        <input
          autoFocus
          type="number"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="rounded-xl border border-slate-300 px-4 py-3 text-lg font-semibold outline-none focus:border-slate-500"
        />
        <span className="text-xs text-slate-400">Cuota: {formatCop(loan.monthlyPayment)}</span>
      </label>
      <SelectField
        label="Abonar desde"
        value={source}
        onChange={setSource}
        options={options}
        placeholder="Selecciona cuenta…"
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded-xl bg-slate-800 py-3 font-medium text-white disabled:opacity-50"
      >
        Confirmar abono
      </button>
    </form>
  );
}
