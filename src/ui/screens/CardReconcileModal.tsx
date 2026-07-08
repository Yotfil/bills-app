import { useState, type FormEvent } from 'react';
import { Modal } from '../components/Modal';
import { MoneyInput } from '../components/MoneyInput';
import { DecimalInput } from '../components/DecimalInput';
import { SelectField } from '../components/SelectField';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { useSessionStore } from '../../store/sessionStore';
import { formatCop, formatForeignAmount, parseDecimal } from '../../lib/currency';
import { computeReconciliation } from '../../domain/reconciliation';
import { copPerUnit, foreignToCop, listCurrencyCodes } from '../../domain/currencyConversion';
import { reconcileCard, reconcileCardForeign } from '../../data/reconciliationService';
import type { CardReconcileModalProps } from './CardReconcileModalProps';

// Reconciliar la deuda de una tarjeta multimoneda (2026-07-07): el usuario elige la MONEDA (COP o
// cualquier divisa) y escribe la deuda real en esa moneda; la app crea el ajuste en esa moneda (§5.7).
// Sirve para cuadrar una deuda existente O fijar la de una moneda nueva (ej. el saldo USD del corte).
export function CardReconcileModal({ open, card, table, onClose }: CardReconcileModalProps) {
  if (!card) return null;
  return (
    <Modal open={open} title={`Reconciliar: ${card.name}`} onClose={onClose}>
      <CardReconcileForm card={card} table={table} onClose={onClose} />
    </Modal>
  );
}

function CardReconcileForm({
  card,
  table,
  onClose,
}: {
  card: NonNullable<CardReconcileModalProps['card']>;
  table: CardReconcileModalProps['table'];
  onClose: () => void;
}) {
  const uid = useSessionStore((s) => s.user?.uid);
  const [currency, setCurrency] = useState(''); // '' = COP
  const [realValue, setRealValue] = useState('');
  const [note, setNote] = useState('');
  const { busy, error, run } = useAsyncAction();

  const currencyOptions = (table ? listCurrencyCodes(table).filter((c) => c !== 'COP') : []).map(
    (c) => ({ value: c, label: c }),
  );
  const isForeign = currency !== '';
  const rate = isForeign && table ? copPerUnit(table, currency) : null;

  // Valor registrado de la moneda elegida: COP = cachedDebt; divisa = su pool en foreignDebts.
  const registeredForeign = card.foreignDebts?.[currency] ?? 0;
  const registered = isForeign ? registeredForeign : card.cachedDebt;

  const parsedForeign = isForeign ? parseDecimal(realValue) : null;
  const deltaForeign =
    isForeign && parsedForeign !== null
      ? Math.round((parsedForeign - registeredForeign) * 100) / 100
      : null;
  const realCop = isForeign || realValue === '' ? null : Math.round(Number(realValue) || 0);
  const copPreview = realCop === null ? null : computeReconciliation(card.cachedDebt, realCop);

  const hasValue = isForeign ? parsedForeign !== null : realCop !== null;
  const hasChange = isForeign ? deltaForeign !== null && deltaForeign !== 0 : copPreview !== null;
  const noRate = isForeign && rate === null;

  function changeCurrency(value: string) {
    setCurrency(value);
    setRealValue(''); // el registrado cambia con la moneda
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!uid || !hasValue || !hasChange || noRate) return;
    const ok = await run(() =>
      isForeign && table && parsedForeign !== null
        ? reconcileCardForeign(uid, card, currency, parsedForeign, table, note)
        : reconcileCard(uid, card, realCop ?? 0, note),
    );
    if (ok) onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <SelectField
        label="Moneda de la deuda"
        value={currency}
        onChange={changeCurrency}
        options={currencyOptions}
        placeholder="COP (pesos)"
      />

      <p className="text-sm text-slate-500">
        Deuda registrada:{' '}
        <span className="font-semibold text-slate-700">
          {isForeign
            ? `${formatForeignAmount(registered)} ${currency}`
            : formatCop(card.cachedDebt)}
        </span>
      </p>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">
          {isForeign ? `Deuda real de la tarjeta (${currency})` : 'Deuda real de la tarjeta (COP)'}
        </span>
        {isForeign ? (
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

      {noRate && (
        <p className="text-sm text-amber-600">
          No hay tasa del día para {currency}: revisa tu conexión para reconciliar en esa moneda.
        </p>
      )}
      {isForeign && rate !== null && parsedForeign !== null && (
        <p className="text-xs text-slate-400">
          ≈ {formatCop(foreignToCop(parsedForeign, rate))} con la tasa del día ({formatCop(rate)} por{' '}
          {currency})
        </p>
      )}

      {hasValue && !hasChange && (
        <p className="text-sm text-slate-400">El valor coincide: no se creará ningún ajuste.</p>
      )}
      {isForeign && deltaForeign !== null && deltaForeign !== 0 && rate !== null && (
        <p className="text-sm">
          Se creará un ajuste de{' '}
          <span className={deltaForeign < 0 ? 'text-emerald-600' : 'text-red-600'}>
            {deltaForeign > 0 ? '+' : '−'}
            {formatForeignAmount(Math.abs(deltaForeign))} {currency}
          </span>{' '}
          <span className="text-slate-400">
            (≈ {deltaForeign > 0 ? '+' : '−'}
            {formatCop(Math.max(1, foreignToCop(Math.abs(deltaForeign), rate)))})
          </span>
          .
        </p>
      )}
      {!isForeign && copPreview && (
        <p className="text-sm">
          Se creará un ajuste de{' '}
          <span className={copPreview.direction === 'decrease' ? 'text-emerald-600' : 'text-red-600'}>
            {copPreview.direction === 'increase' ? '+' : '−'}
            {formatCop(copPreview.amount)}
          </span>
          .
        </p>
      )}

      <input
        placeholder="Nota (opcional, p.ej. corte de USD)"
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
        disabled={busy || !hasValue || !hasChange || noRate}
        className="rounded-xl bg-slate-800 py-3 font-medium text-white disabled:opacity-50"
      >
        {hasValue && !hasChange ? 'Sin cambios' : 'Reconciliar'}
      </button>
    </form>
  );
}
