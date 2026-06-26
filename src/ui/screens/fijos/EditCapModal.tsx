import { useState } from 'react';
import { Modal } from '../../components/Modal';
import { MoneyInput } from '../../components/MoneyInput';
import type { EditCapModalProps } from './EditCapModalProps';

// Editar el tope de un fijo respaldado por presupuesto desde la pantalla de Fijos (§5.9). El nuevo
// valor va en espejo con el presupuesto de la categoría (mes en curso); la plantilla no cambia.
export function EditCapModal({ open, fixed, onConfirm, onClose }: EditCapModalProps) {
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  // Reinicia el campo en el flanco de apertura (patrón endorsado: ajustar estado en render).
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setAmount(String(fixed?.budgetedAmount ?? ''));
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
    <Modal open={open} title={`Editar tope: ${fixed?.name ?? ''}`} onClose={onClose}>
      <p className="mb-3 text-sm text-slate-500">
        Cambia el tope de este mes. Se actualiza también el presupuesto de la categoría; la plantilla
        no cambia.
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
