import { useState } from 'react';
import { Modal } from './Modal';
import { MoneyInput } from './MoneyInput';
import type { HormigaCapModalProps } from './HormigaCapModalProps';

// Poner / editar / quitar el tope mensual de gasto hormiga (§5.8). Reusa Modal + MoneyInput.
export function HormigaCapModal({ open, initialValue, hasCap, onSave, onClose }: HormigaCapModalProps) {
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  // Reinicia el campo al abrir (patrón endorsado: ajustar estado en render, no en efecto).
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setAmount(initialValue ? String(initialValue) : '');
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  async function handleSave(value: number | null) {
    setBusy(true);
    try {
      await onSave(value);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  const parsed = Math.round(Number(amount) || 0);

  return (
    <Modal open={open} title="Tope de gasto hormiga 🐜" onClose={onClose}>
      <p className="mb-3 text-sm text-slate-500">
        Cuánto quieres permitirte como máximo al mes en gastos hormiga. Te avisaremos (sin regaño)
        cuando te acerques.
      </p>
      <MoneyInput
        autoFocus
        placeholder="Tope mensual (COP)"
        value={amount}
        onChange={setAmount}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
      />
      <button
        type="button"
        onClick={() => void handleSave(parsed > 0 ? parsed : null)}
        disabled={busy || parsed <= 0}
        className="mt-4 w-full rounded-xl bg-slate-800 py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        Guardar tope
      </button>
      {hasCap && (
        <button
          type="button"
          onClick={() => void handleSave(null)}
          disabled={busy}
          className="mt-2 w-full text-center text-xs text-slate-400 underline"
        >
          Quitar el tope
        </button>
      )}
    </Modal>
  );
}
