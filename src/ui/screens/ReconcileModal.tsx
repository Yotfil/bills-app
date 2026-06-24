import { useState, type FormEvent } from 'react';
import { Modal } from '../components/Modal';
import { MoneyInput } from '../components/MoneyInput';
import { formatCop } from '../../lib/currency';
import { computeReconciliation } from '../../domain/reconciliation';
import type { ReconcileModalProps } from './ReconcileModalProps';
import type { ReconcileTarget } from './ReconcileTarget';

// Reconciliar cuenta / tarjeta / crédito (CLAUDE.md §5.7): el usuario indica el valor real y la
// app crea un movimiento de ajuste por el desfase. Muestra una vista previa antes de confirmar.
// Es genérico: cada pantalla arma el `target` con su etiqueta y su función de reconciliación.
export function ReconcileModal({ open, target, onClose }: ReconcileModalProps) {
  if (!target) return null;
  return (
    <Modal open={open} title={`Reconciliar: ${target.name}`} onClose={onClose}>
      <ReconcileForm key={target.id} target={target} onClose={onClose} />
    </Modal>
  );
}

function ReconcileForm({ target, onClose }: { target: ReconcileTarget; onClose: () => void }) {
  const [realValue, setRealValue] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const real = realValue === '' ? null : Math.round(Number(realValue) || 0);
  const preview = real === null ? null : computeReconciliation(target.registeredValue, real);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (real === null) return;
    setBusy(true);
    try {
      await target.reconcile(real, note);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <p className="text-sm text-slate-500">
        {target.registeredLabel}:{' '}
        <span className="font-semibold text-slate-700">{formatCop(target.registeredValue)}</span>
      </p>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">{target.inputLabel}</span>
        <MoneyInput
          autoFocus
          value={realValue}
          onChange={setRealValue}
          className="rounded-xl border border-slate-300 px-4 py-3 text-lg font-semibold outline-none focus:border-slate-500"
        />
      </label>

      {preview === null && real !== null && (
        <p className="text-sm text-slate-400">El valor coincide: no se creará ningún ajuste.</p>
      )}
      {preview && (
        <p className="text-sm">
          Se creará un ajuste de{' '}
          <span
            className={
              preview.direction === target.goodDirection ? 'text-emerald-600' : 'text-red-600'
            }
          >
            {preview.direction === 'increase' ? '+' : '−'}
            {formatCop(preview.amount)}
          </span>
          .
        </p>
      )}

      <input
        placeholder="Nota (opcional, p.ej. intereses del mes)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
      />

      <button
        type="submit"
        disabled={busy || real === null || preview === null}
        className="rounded-xl bg-slate-800 py-3 font-medium text-white disabled:opacity-50"
      >
        {preview === null ? 'Sin cambios' : 'Reconciliar'}
      </button>
    </form>
  );
}
