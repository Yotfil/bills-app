import { useState } from 'react';
import { useUserCollection } from '../hooks/useUserCollection';
import { useSessionStore } from '../../store/sessionStore';
import { CardForm } from './CardForm';
import { BackButton } from '../components/BackButton';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { formatCop } from '../../lib/currency';
import { cardAvailableCredit } from '../../domain/derived';
import { entityHasMovements } from '../../domain/entityUsage';
import { archiveCard, deleteCard, subscribeCards } from '../../data/cardRepository';
import { subscribeTransactions } from '../../data/transactionRepository';
import type { CreditCard, Transaction } from '../../domain/types';

export function CardsScreen() {
  const uid = useSessionStore((s) => s.user?.uid);
  const { items, loading } = useUserCollection<CreditCard>(subscribeCards);
  const { items: transactions } = useUserCollection<Transaction>(subscribeTransactions);
  const [editing, setEditing] = useState<CreditCard | null>(null);
  const [deleting, setDeleting] = useState<CreditCard | null>(null);
  const [creating, setCreating] = useState(false);

  const cards = items.filter((c) => !c.archived).sort((a, b) => a.sortOrder - b.sortOrder);

  async function handleArchive(card: CreditCard) {
    if (!uid) return;
    if (!confirm(`¿Archivar la tarjeta "${card.name}"? Su histórico se conserva.`)) return;
    await archiveCard(uid, card.id);
  }

  // El borrado físico solo procede si la tarjeta NO tiene movimientos (§8.4).
  const deletingBlocked = deleting ? entityHasMovements(transactions, 'card', deleting.id) : false;

  async function handleDelete() {
    if (!uid || !deleting) return;
    await deleteCard(uid, deleting.id);
    setDeleting(null);
  }

  async function handleArchiveFromModal() {
    if (!uid || !deleting) return;
    await archiveCard(uid, deleting.id);
    setDeleting(null);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
      <BackButton />
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
                <button
                  type="button"
                  onClick={() => setDeleting(card)}
                  className="text-red-500 underline"
                >
                  Eliminar
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

      <CardForm key={`create-${creating}`} open={creating} onClose={() => setCreating(false)} />
      <CardForm
        key={editing?.id ?? 'edit-none'}
        open={!!editing}
        card={editing}
        onClose={() => setEditing(null)}
      />
      <ConfirmDeleteModal
        open={!!deleting}
        itemLabel={deleting?.name ?? ''}
        itemKind="la tarjeta"
        blocked={deletingBlocked}
        onConfirm={() => void handleDelete()}
        onArchive={() => void handleArchiveFromModal()}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
