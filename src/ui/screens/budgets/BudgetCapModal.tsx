import { useState } from 'react';
import { Modal } from '../../components/Modal';
import { MoneyInput } from '../../components/MoneyInput';
import type { BudgetCapModalProps } from './BudgetCapModalProps';

// Editar el tope de un presupuesto NORMAL para ESTE mes (override, §5.9). No toca la base ni los otros
// meses; el próximo mes vuelve a la base. Para volver a la base se usa "Volver a la base" en la card.
export function BudgetCapModal({
  open,
  categoryName,
  currentValue,
  onConfirm,
  onClose,
}: BudgetCapModalProps) {
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  // Reinicia el campo en el flanco de apertura (patrón endorsado: ajustar estado en render).
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setAmount(String(currentValue || ''));
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  async function handleConfirm() {
    const value = Math.round(Number(amount) || 0);
    if (value <= 0) return;
    setBusy(true);
    try {
      await onConfirm(value);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title={`Editar tope: ${categoryName}`} onClose={onClose}>
      <p className="mb-3 text-sm text-slate-500">
        Cambia el tope SOLO de este mes; el próximo mes vuelve a la base. La base se cambia en la
        Plantilla.
      </p>
      <MoneyInput
        autoFocus
        placeholder="Tope del mes (COP)"
        value={amount}
        onChange={setAmount}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
      />
      <button
        type="button"
        onClick={() => void handleConfirm()}
        disabled={busy}
        className="mt-4 w-full rounded-xl bg-slate-800 py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        Guardar
      </button>
    </Modal>
  );
}
