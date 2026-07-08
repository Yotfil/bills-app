import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserCollection } from '../hooks/useUserCollection';
import { useFixedMonthly } from '../hooks/useFixedMonthly';
import { useSessionStore } from '../../store/sessionStore';
import { CardForm } from './CardForm';
import { BackButton } from '../components/BackButton';
import { Pencil, Scale, Archive, Trash2, ChevronRight } from 'lucide-react';
import { ActionMenu } from '../components/ActionMenu';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { ReconcileModal } from './ReconcileModal';
import { formatCop, formatForeignAmount } from '../../lib/currency';
import { cardAvailableCredit } from '../../domain/derived';
import { cardTotalDebtCop } from '../../domain/foreignBalance';
import { copPerUnit } from '../../domain/currencyConversion';
import { entityHasMovements } from '../../domain/entityUsage';
import { cuotaMonthlyFor, hasLinkedCuota, isCuotaPaid } from '../../domain/debtCuota';
import { archiveCard, deleteCard, subscribeCards } from '../../data/cardRepository';
import { subscribeTransactions } from '../../data/transactionRepository';
import { subscribeFixedTemplates } from '../../data/fixedTemplateRepository';
import { revertFixedPayment } from '../../data/fixedMonthlyRepository';
import { payLinkedCuota } from '../../data/cuotaService';
import { reconcileCard, reconcileCardForeign } from '../../data/reconciliationService';
import { useUsdRateTable } from '../hooks/useUsdRateTable';
import { currentMonthKey, formatMonthLabel } from '../../lib/date';
import type { ReconcileTarget } from './ReconcileTarget';
import type { CreditCard, FixedObligationTemplate, Transaction } from '../../domain/types';

export function CardsScreen() {
  const uid = useSessionStore((s) => s.user?.uid);
  const navigate = useNavigate();
  const { items, loading } = useUserCollection<CreditCard>(subscribeCards);
  const { items: transactions } = useUserCollection<Transaction>(subscribeTransactions);
  const { items: templates } = useUserCollection<FixedObligationTemplate>(subscribeFixedTemplates);
  // Fijos del mes en curso: de ahí se deriva el estado de pago de la cuota ligada a cada tarjeta.
  const month = currentMonthKey();
  const monthLabel = formatMonthLabel(month);
  const { items: monthlyFixeds } = useFixedMonthly(month);
  const [editing, setEditing] = useState<CreditCard | null>(null);
  const [deleting, setDeleting] = useState<CreditCard | null>(null);
  // Reconciliar: la tarjeta y en qué pool (COP o su divisa). `foreign` = reconciliar la deuda en divisa.
  const [reconciling, setReconciling] = useState<{ card: CreditCard; foreign: boolean } | null>(null);
  const [creating, setCreating] = useState(false);
  const { table } = useUsdRateTable();

  const cards = items.filter((c) => !c.archived).sort((a, b) => a.sortOrder - b.sortOrder);

  // Pagar en 1 toque la cuota del mes ligada a la tarjeta (fijo "abono a deuda" que apunta a ella).
  function handlePayCuota(card: CreditCard) {
    if (uid) void payLinkedCuota(uid, { kind: 'card', id: card.id }, month);
  }

  function handleUndoCuota(card: CreditCard) {
    const cuota = cuotaMonthlyFor(card.id, monthlyFixeds);
    if (uid && cuota) void revertFixedPayment(uid, cuota);
  }

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

  // Reconciliar la DEUDA (§5.7): útil cuando los intereses la subieron o las pruebas la desfasaron.
  // Una tarjeta mixta tiene dos pools: COP (cachedDebt) y divisa (cachedForeignDebt). El pool en
  // divisa se reconcilia EN LA DIVISA (el COP es el reflejo de la tasa del día).
  const reconcileCardRef = reconciling?.card ?? null;
  const foreignRate =
    reconcileCardRef?.foreignCurrency && table
      ? copPerUnit(table, reconcileCardRef.foreignCurrency)
      : null;
  const reconcileTarget: ReconcileTarget | null =
    reconciling && uid
      ? reconciling.foreign && foreignRate !== null && table
        ? {
            id: `${reconciling.card.id}-foreign`,
            name: reconciling.card.name,
            registeredValue: Math.round((reconciling.card.cachedForeignDebt ?? 0) * foreignRate),
            registeredLabel: 'Deuda registrada',
            inputLabel: `Deuda real de la tarjeta (${reconciling.card.foreignCurrency})`,
            goodDirection: 'decrease', // menos deuda = verde
            reconcile: () => Promise.resolve(false), // en modo divisa el modal usa reconcileForeign
            foreignCurrency: reconciling.card.foreignCurrency,
            foreignAmount: reconciling.card.cachedForeignDebt ?? 0,
            copPerUnit: foreignRate,
            reconcileForeign: (realForeign, note) =>
              reconcileCardForeign(uid, reconciling.card, realForeign, table, note),
          }
        : {
            id: reconciling.card.id,
            name: reconciling.card.name,
            registeredValue: reconciling.card.cachedDebt,
            registeredLabel: 'Deuda registrada',
            inputLabel: 'Deuda real de la tarjeta (COP)',
            goodDirection: 'decrease', // menos deuda = verde
            reconcile: (real, note) => reconcileCard(uid, reconciling.card, real, note),
          }
      : null;

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
        {cards.map((card) => {
          const linked = hasLinkedCuota(card.id, templates);
          const cuotaPaid = isCuotaPaid(card.id, monthlyFixeds);
          // Reconciliar en divisa solo si la tarjeta cobra en una divisa y hay tasa del día.
          const canReconcileForeign =
            !!card.foreignCurrency && table !== null && copPerUnit(table, card.foreignCurrency) !== null;
          const totalDebt = cardTotalDebtCop(card, table);
          const hasForeignDebt = !!card.foreignCurrency && (card.cachedForeignDebt ?? 0) !== 0;
          return (
            <li key={card.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <button
                  type="button"
                  onClick={() => navigate(`/mas/tarjetas/${card.id}/movimientos`)}
                  className="truncate text-left font-semibold text-slate-800 hover:underline"
                >
                  {card.name}
                </button>
                <ActionMenu
                  ariaLabel={`Acciones de ${card.name}`}
                  items={[
                    { label: 'Editar', icon: Pencil, onSelect: () => setEditing(card) },
                    {
                      label: canReconcileForeign ? 'Reconciliar deuda (COP)' : 'Reconciliar',
                      icon: Scale,
                      onSelect: () => setReconciling({ card, foreign: false }),
                    },
                    ...(canReconcileForeign
                      ? [
                          {
                            label: `Reconciliar deuda (${card.foreignCurrency})`,
                            icon: Scale,
                            onSelect: () => setReconciling({ card, foreign: true }),
                          },
                        ]
                      : []),
                    { label: 'Archivar', icon: Archive, onSelect: () => handleArchive(card) },
                    {
                      label: 'Eliminar',
                      icon: Trash2,
                      onSelect: () => setDeleting(card),
                      danger: true,
                    },
                  ]}
                />
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
                  {/* Tarjeta mixta: la deuda total ≈ COP incluye la parte en divisa convertida EN
                      VIVO; debajo, el monto exacto en la divisa. */}
                  <dd className="text-sm font-medium text-red-600">
                    {hasForeignDebt ? '≈ ' : ''}
                    {formatCop(totalDebt)}
                  </dd>
                  {hasForeignDebt && (
                    <dd className="text-[11px] text-slate-400">
                      {formatForeignAmount(card.cachedForeignDebt ?? 0)} {card.foreignCurrency}
                    </dd>
                  )}
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Disponible</dt>
                  <dd className="text-sm font-semibold text-emerald-600">
                    {hasForeignDebt ? '≈ ' : ''}
                    {formatCop(cardAvailableCredit(card, table))}
                  </dd>
                </div>
              </dl>

              <button
                type="button"
                onClick={() => navigate(`/mas/tarjetas/${card.id}/movimientos`)}
                className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Ver movimientos <ChevronRight className="h-4 w-4" />
              </button>

              {/* Cuota del mes ligada a un fijo "abono a deuda" que apunta a esta tarjeta (§5.5). */}
              {linked && (
                <>
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <span className="text-xs text-slate-500">
                      Cuota de <span className="capitalize">{monthLabel}</span>
                    </span>
                    {cuotaPaid ? (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        Pagada
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        Pendiente
                      </span>
                    )}
                  </div>
                  {cuotaPaid ? (
                    <button
                      type="button"
                      onClick={() => handleUndoCuota(card)}
                      className="mt-2 w-full rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-600"
                    >
                      Deshacer pago de la cuota
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handlePayCuota(card)}
                      className="mt-2 w-full rounded-lg bg-slate-800 py-2 text-sm font-medium text-white"
                    >
                      Pagar cuota
                    </button>
                  )}
                </>
              )}
            </li>
          );
        })}
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
      <ReconcileModal
        open={!!reconciling}
        target={reconcileTarget}
        onClose={() => setReconciling(null)}
      />
    </div>
  );
}
