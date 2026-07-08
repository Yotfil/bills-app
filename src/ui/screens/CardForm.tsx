import { useState, type FormEvent } from 'react';
import { Modal } from '../components/Modal';
import { MoneyInput } from '../components/MoneyInput';
import { DecimalInput } from '../components/DecimalInput';
import { SelectField } from '../components/SelectField';
import { useSessionStore } from '../../store/sessionStore';
import { useUsdRateTable } from '../hooks/useUsdRateTable';
import { createCard, updateCard } from '../../data/cardRepository';
import { listCurrencyCodes } from '../../domain/currencyConversion';
import { formatForeignAmount, parseDecimal } from '../../lib/currency';
import type { CardFormProps } from './CardFormProps';

// Formulario para crear/editar una tarjeta (CLAUDE.md §8.4). La deuda no se edita aquí: cambia con
// gastos y abonos (§5.5). Una tarjeta puede cobrar en una divisa (tarjeta mixta, 2026-07-07): la
// divisa se elige aquí; la deuda en divisa arranca en 0 (o en la semilla al crear) y se ajusta
// reconciliando en divisa.
export function CardForm({ open, card, onClose }: CardFormProps) {
  const uid = useSessionStore((s) => s.user?.uid);
  const isEdit = !!card;
  const [name, setName] = useState(card?.name ?? '');
  const [creditLimit, setCreditLimit] = useState(String(card?.creditLimit ?? ''));
  const [initialDebt, setInitialDebt] = useState(String(card?.cachedDebt ?? ''));
  const [foreignCurrency, setForeignCurrency] = useState(card?.foreignCurrency ?? '');
  const [initialForeignDebt, setInitialForeignDebt] = useState('');
  const [busy, setBusy] = useState(false);
  const formKey = card?.id ?? 'new';
  const { table } = useUsdRateTable();

  // La divisa solo se elige si la tarjeta aún no tiene una fijada (evita dejar huérfana una deuda en
  // divisa existente). Monedas de la API sin COP (COP = "sin divisa"); conserva la ya guardada.
  const currencyLocked = isEdit && !!card?.foreignCurrency;
  const codes = table ? listCurrencyCodes(table).filter((c) => c !== 'COP') : [];
  const currencyOptions = (
    foreignCurrency && !codes.includes(foreignCurrency) ? [foreignCurrency, ...codes] : codes
  ).map((c) => ({ value: c, label: c }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!uid || !name.trim()) return;
    setBusy(true);
    try {
      if (isEdit && card) {
        await updateCard(uid, card.id, {
          name: name.trim(),
          creditLimit: Math.round(Number(creditLimit) || 0),
          // Habilitar la divisa en una tarjeta existente (si aún no tenía). Si ya tenía, se conserva.
          foreignCurrency: foreignCurrency || null,
        });
      } else {
        await createCard(uid, {
          name,
          creditLimit: Math.round(Number(creditLimit) || 0),
          initialDebt: Math.round(Number(initialDebt) || 0),
          foreignCurrency: foreignCurrency || null,
          initialForeignDebt: foreignCurrency ? (parseDecimal(initialForeignDebt) ?? 0) : 0,
        });
      }
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title={isEdit ? 'Editar tarjeta' : 'Nueva tarjeta'} onClose={onClose}>
      <form key={formKey} onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          autoFocus
          placeholder="Nombre (p.ej. TC Davivienda)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
        />
        <MoneyInput
          placeholder="Cupo total (COP)"
          value={creditLimit}
          onChange={setCreditLimit}
          className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
        />
        {!isEdit && (
          <MoneyInput
            placeholder="Deuda actual (COP)"
            value={initialDebt}
            onChange={setInitialDebt}
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
          />
        )}

        {/* Divisa opcional en la que la tarjeta también cobra (tarjeta mixta). */}
        {currencyLocked ? (
          <p className="text-xs text-slate-400">
            Cobra en {card!.foreignCurrency} · deuda{' '}
            {formatForeignAmount(card!.cachedForeignDebt ?? 0)} {card!.foreignCurrency}. El monto en{' '}
            {card!.foreignCurrency} se corrige reconciliando en esa moneda (§5.7).
          </p>
        ) : (
          <SelectField
            label="Moneda extranjera (opcional)"
            value={foreignCurrency}
            onChange={setForeignCurrency}
            options={currencyOptions}
            placeholder="Solo COP (sin divisa)"
          />
        )}
        {!isEdit && foreignCurrency && (
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Deuda actual en {foreignCurrency}</span>
            <DecimalInput
              placeholder="0"
              value={initialForeignDebt}
              onChange={setInitialForeignDebt}
              className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
            />
          </label>
        )}

        {isEdit && (
          <p className="text-xs text-slate-400">
            La deuda no se edita aquí: cambia con gastos y abonos a la tarjeta (§5.5).
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-slate-800 py-3 font-medium text-white disabled:opacity-50"
        >
          {isEdit ? 'Guardar' : 'Crear tarjeta'}
        </button>
      </form>
    </Modal>
  );
}
