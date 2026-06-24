import { useState, type FormEvent } from 'react';
import { Modal } from '../components/Modal';
import { useSessionStore } from '../../store/sessionStore';
import { formatCop } from '../../lib/currency';
import { computeReconciliation } from '../../domain/reconciliation';
import { reconcileAccount } from '../../data/reconciliationService';
import type { ReconcileModalProps } from './ReconcileModalProps';

// Reconciliar una cuenta (CLAUDE.md §5.7): el usuario indica el saldo real y la app crea un
// movimiento de ajuste por el desfase. Muestra una vista previa antes de confirmar.
export function ReconcileModal({ open, account, onClose }: ReconcileModalProps) {
  if (!account) return null;
  return (
    <Modal open={open} title={`Reconciliar: ${account.name}`} onClose={onClose}>
      <ReconcileForm key={account.id} account={account} onClose={onClose} />
    </Modal>
  );
}

function ReconcileForm({
  account,
  onClose,
}: {
  account: NonNullable<ReconcileModalProps['account']>;
  onClose: () => void;
}) {
  const uid = useSessionStore((s) => s.user?.uid);
  const [realValue, setRealValue] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const realBalance = realValue === '' ? null : Math.round(Number(realValue) || 0);
  const preview =
    realBalance === null ? null : computeReconciliation(account.cachedBalance, realBalance);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!uid || realBalance === null) return;
    setBusy(true);
    try {
      await reconcileAccount(uid, account, realBalance, note);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <p className="text-sm text-slate-500">
        Saldo registrado:{' '}
        <span className="font-semibold text-slate-700">{formatCop(account.cachedBalance)}</span>
      </p>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">Saldo real de la cuenta (COP)</span>
        <input
          autoFocus
          type="number"
          inputMode="numeric"
          value={realValue}
          onChange={(e) => setRealValue(e.target.value)}
          className="rounded-xl border border-slate-300 px-4 py-3 text-lg font-semibold outline-none focus:border-slate-500"
        />
      </label>

      {preview === null && realBalance !== null && (
        <p className="text-sm text-slate-400">El saldo coincide: no se creará ningún ajuste.</p>
      )}
      {preview && (
        <p className="text-sm">
          Se creará un ajuste de{' '}
          <span className={preview.direction === 'increase' ? 'text-emerald-600' : 'text-red-600'}>
            {preview.direction === 'increase' ? '+' : '−'}
            {formatCop(preview.amount)}
          </span>
          .
        </p>
      )}

      <input
        placeholder="Nota (opcional, p.ej. olvidé registrar efectivo)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
      />

      <button
        type="submit"
        disabled={busy || realBalance === null || preview === null}
        className="rounded-xl bg-slate-800 py-3 font-medium text-white disabled:opacity-50"
      >
        {preview === null ? 'Sin cambios' : 'Reconciliar'}
      </button>
    </form>
  );
}
