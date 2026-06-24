import { useState, type FormEvent } from 'react';
import { useUserCollection } from '../hooks/useUserCollection';
import { useSessionStore } from '../../store/sessionStore';
import { Modal } from '../components/Modal';
import { formatCop } from '../../lib/currency';
import { cardAvailableCredit } from '../../domain/derived';
import { archiveCard, createCard, subscribeCards, updateCard } from '../../data/cardRepository';
import type { CreditCard } from '../../domain/types';

export function CardsScreen() {
  const uid = useSessionStore((s) => s.user?.uid);
  const { items, loading } = useUserCollection<CreditCard>(subscribeCards);
  const [editing, setEditing] = useState<CreditCard | null>(null);
  const [creating, setCreating] = useState(false);

  const cards = items.filter((c) => !c.archived).sort((a, b) => a.sortOrder - b.sortOrder);

  async function handleArchive(card: CreditCard) {
    if (!uid) return;
    if (!confirm(`¿Archivar la tarjeta "${card.name}"? Su histórico se conserva.`)) return;
    await archiveCard(uid, card.id);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Tarjetas</h1>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white"
        >
          + Nueva
        </button>
      </header>

      {loading && <p className="text-slate-400">Cargando…</p>}
      {!loading && cards.length === 0 && (
        <p className="text-slate-500">Aún no tienes tarjetas registradas.</p>
      )}

      <ul className="flex flex-col gap-3">
        {cards.map((card) => (
          <li key={card.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between">
              <p className="font-semibold text-slate-800">{card.name}</p>
              <div className="flex gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => setEditing(card)}
                  className="text-slate-500 underline"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => handleArchive(card)}
                  className="text-slate-400 underline"
                >
                  Archivar
                </button>
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <dt className="text-xs text-slate-400">Cupo</dt>
                <dd className="text-sm font-medium text-slate-800">
                  {formatCop(card.creditLimit)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Deuda</dt>
                <dd className="text-sm font-medium text-red-600">{formatCop(card.cachedDebt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Disponible</dt>
                <dd className="text-sm font-semibold text-emerald-600">
                  {formatCop(cardAvailableCredit(card))}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>

      <CardForm open={creating} onClose={() => setCreating(false)} />
      <CardForm open={!!editing} card={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

interface CardFormProps {
  open: boolean;
  card?: CreditCard | null;
  onClose: () => void;
}

function CardForm({ open, card, onClose }: CardFormProps) {
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
        <input
          type="number"
          inputMode="numeric"
          placeholder="Cupo total (COP)"
          value={creditLimit}
          onChange={(e) => setCreditLimit(e.target.value)}
          className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
        />
        {!isEdit && (
          <input
            type="number"
            inputMode="numeric"
            placeholder="Deuda actual (COP)"
            value={initialDebt}
            onChange={(e) => setInitialDebt(e.target.value)}
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
