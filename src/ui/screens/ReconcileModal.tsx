import { useState, type FormEvent } from 'react';
import { Modal } from '../components/Modal';
import { MoneyInput } from '../components/MoneyInput';
import { DecimalInput } from '../components/DecimalInput';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { formatCop, formatForeignAmount, parseDecimal } from '../../lib/currency';
import { computeReconciliation } from '../../domain/reconciliation';
import { foreignToCop } from '../../domain/currencyConversion';
import type { ReconcileModalProps } from './ReconcileModalProps';
import type { ReconcileTarget } from './ReconcileTarget';

// Reconciliar cuenta / tarjeta / crédito (CLAUDE.md §5.7): el usuario indica el valor real y la
// app crea un movimiento de ajuste por el desfase. Muestra una vista previa antes de confirmar.
// Es genérico: cada pantalla arma el `target` con su etiqueta y su función de reconciliación.
// Si la cuenta vive en otra moneda (y hay tasa del día), se reconcilia EN LA DIVISA y el COP
// es solo el reflejo de la conversión (decisión 2026-07-05).
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
  const { busy, error, run } = useAsyncAction();

  // Modo divisa: solo si la pantalla pasó moneda + tasa + acción (sin tasa se degrada a COP).
  const foreign =
    target.foreignCurrency && target.copPerUnit != null && target.reconcileForeign
      ? {
          currency: target.foreignCurrency,
          rate: target.copPerUnit,
          submit: target.reconcileForeign,
        }
      : null;

  const parsedForeign = foreign ? parseDecimal(realValue) : null;
  // Modo divisa: el desfase se calcula EN LA DIVISA (el ajuste vive en esa moneda y el COP es
  // solo la conversión del día). Redondeo a centavos para no ver desfases fantasma de float.
  const deltaForeign =
    foreign && parsedForeign !== null
      ? Math.round((parsedForeign - (target.foreignAmount ?? 0)) * 100) / 100
      : null;
  // Modo COP (cuentas sin divisa, tarjetas, créditos): igual que siempre.
  const realCop = foreign
    ? null
    : realValue === ''
      ? null
      : Math.round(Number(realValue) || 0);
  const copPreview = realCop === null ? null : computeReconciliation(target.registeredValue, realCop);

  const hasValue = foreign ? parsedForeign !== null : realCop !== null;
  const hasChange = foreign ? deltaForeign !== null && deltaForeign !== 0 : copPreview !== null;
  // Dirección del ajuste (para colorear igual que el modo COP: subir saldo = verde).
  const direction = foreign
    ? deltaForeign !== null && deltaForeign > 0
      ? 'increase'
      : 'decrease'
    : (copPreview?.direction ?? 'increase');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!hasValue || !hasChange) return;
    const ok = await run(() =>
      foreign && parsedForeign !== null
        ? foreign.submit(parsedForeign, note)
        : target.reconcile(realCop ?? 0, note),
    );
    if (ok) onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <p className="text-sm text-slate-500">
        {target.registeredLabel}:{' '}
        <span className="font-semibold text-slate-700">
          {foreign && target.foreignAmount != null
            ? `${formatForeignAmount(target.foreignAmount)} ${foreign.currency}`
            : formatCop(target.registeredValue)}
        </span>
        {foreign && target.foreignAmount != null && (
          <span className="text-slate-400"> (≈ {formatCop(target.registeredValue)})</span>
        )}
      </p>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">{target.inputLabel}</span>
        {foreign ? (
          <DecimalInput
            autoFocus
            value={realValue}
            onChange={setRealValue}
            className="rounded-xl border border-slate-300 px-4 py-3 text-lg font-semibold outline-none focus:border-slate-500"
          />
        ) : (
          <MoneyInput
            autoFocus
            value={realValue}
            onChange={setRealValue}
            className="rounded-xl border border-slate-300 px-4 py-3 text-lg font-semibold outline-none focus:border-slate-500"
          />
        )}
      </label>

      {foreign && parsedForeign !== null && (
        <p className="text-xs text-slate-400">
          ≈ {formatCop(foreignToCop(parsedForeign, foreign.rate))} con la tasa del día (
          {formatCop(foreign.rate)} por {foreign.currency})
        </p>
      )}

      {hasValue && !hasChange && (
        <p className="text-sm text-slate-400">El valor coincide: no se creará ningún ajuste.</p>
      )}
      {/* El ajuste de una cuenta en divisa se muestra EN LA DIVISA (el COP es la conversión). */}
      {foreign && deltaForeign !== null && deltaForeign !== 0 && (
        <p className="text-sm">
          Se creará un ajuste de{' '}
          <span
            className={direction === target.goodDirection ? 'text-emerald-600' : 'text-red-600'}
          >
            {deltaForeign > 0 ? '+' : '−'}
            {formatForeignAmount(Math.abs(deltaForeign))} {foreign.currency}
          </span>{' '}
          <span className="text-slate-400">
            (≈ {deltaForeign > 0 ? '+' : '−'}
            {formatCop(Math.max(1, foreignToCop(Math.abs(deltaForeign), foreign.rate)))})
          </span>
          .
        </p>
      )}
      {!foreign && copPreview && (
        <p className="text-sm">
          Se creará un ajuste de{' '}
          <span
            className={
              copPreview.direction === target.goodDirection ? 'text-emerald-600' : 'text-red-600'
            }
          >
            {copPreview.direction === 'increase' ? '+' : '−'}
            {formatCop(copPreview.amount)}
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

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || !hasValue || !hasChange}
        className="rounded-xl bg-slate-800 py-3 font-medium text-white disabled:opacity-50"
      >
        {hasValue && !hasChange ? 'Sin cambios' : 'Reconciliar'}
      </button>
    </form>
  );
}
