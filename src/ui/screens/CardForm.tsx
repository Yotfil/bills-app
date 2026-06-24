import { useState, type FormEvent } from 'react';
import { Modal } from '../components/Modal';
import { MoneyInput } from '../components/MoneyInput';
import { useSessionStore } from '../../store/sessionStore';
import { createCard, updateCard } from '../../data/cardRepository';
import type { CardFormProps } from './CardFormProps';

// Formulario para crear/editar una tarjeta (CLAUDE.md §8.4). La deuda no se edita aquí:
// cambia con gastos y abonos (§5.5).
export function CardForm({ open, card, onClose }: CardFormProps) {
  const uid = useSessionStore((s) => s.user?.uid);
  const isEdit = !!card;
  const [name, setName] = useState(card?.name ?? '');
  const [creditLimit, setCreditLimit] = useState(String(card?.creditLimit ?? ''));
  const [initialDebt, setInitialDebt] = useState(String(card?.cachedDebt ?? ''));
  const [busy, setBusy] = useState(false);
  const formKey = card?.id ?? 'new';

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!uid || !name.trim()) return;
    setBusy(true);
    try {
      if (isEdit && card) {
        await updateCard(uid, card.id, {
          name: name.trim(),
          creditLimit: Math.round(Number(creditLimit) || 0),
        });
      } else {
        await createCard(uid, {
          name,
          creditLimit: Math.round(Number(creditLimit) || 0),
          initialDebt: Math.round(Number(initialDebt) || 0),
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
