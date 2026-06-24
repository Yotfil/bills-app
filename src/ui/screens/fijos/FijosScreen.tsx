import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useUserCollection } from '../../hooks/useUserCollection';
import { useFixedMonthly } from '../../hooks/useFixedMonthly';
import { useSessionStore } from '../../../store/sessionStore';
import { MonthSelector } from '../../components/MonthSelector';
import { DisponibleRealBar } from '../../components/DisponibleRealBar';
import { SearchBar } from '../../components/SearchBar';
import { matchesQuery } from '../../../lib/text';
import { FixedTotalsBar } from './FixedTotalsBar';
import { FixedRow } from './FixedRow';
import { PayFixedModal } from './PayFixedModal';
import { fixedTotals } from '../../../domain/fixed';
import { addMonths, currentMonthKey } from '../../../lib/date';
import { subscribeAccounts } from '../../../data/accountRepository';
import { subscribeCards } from '../../../data/cardRepository';
import { subscribeLoans } from '../../../data/loanRepository';
import { subscribeFixedTemplates } from '../../../data/fixedTemplateRepository';
import {
  generateFixedMonthly,
  markFixedAllocated,
  markFixedPaidWithoutTransaction,
  markFixedPending,
  payFixed,
  revertFixedPayment,
} from '../../../data/fixedMonthlyRepository';
import type { PayFixedInput } from '../../../data/PayFixedInput';
import type {
  Account,
  CreditCard,
  FixedObligationMonthly,
  FixedObligationTemplate,
  FixedStatus,
  Loan,
} from '../../../domain/types';

// Orden de lectura: lo que falta primero, lo pagado al final.
const STATUS_ORDER: Record<FixedStatus, number> = { pending: 0, allocated: 1, paid: 2 };

export function FijosScreen() {
  const uid = useSessionStore((s) => s.user?.uid);
  const [month, setMonth] = useState(currentMonthKey());
  const { items: fijos, loading } = useFixedMonthly(month);
  const { items: accounts } = useUserCollection<Account>(subscribeAccounts);
  const { items: cards } = useUserCollection<CreditCard>(subscribeCards);
  const { items: loans } = useUserCollection<Loan>(subscribeLoans);
  const { items: templates } = useUserCollection<FixedObligationTemplate>(subscribeFixedTemplates);
  const [paying, setPaying] = useState<FixedObligationMonthly | null>(null);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState('');

  const sorted = [...fijos]
    .filter((f) => matchesQuery(search, f.name))
    .sort(
      (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.name.localeCompare(b.name),
    );
  const totals = fixedTotals(fijos);
  const activeTemplates = templates.filter((t) => t.active && !t.archived);
  const unpaid = fijos.filter((f) => f.status !== 'paid');

  async function handleMarkAllPaid() {
    if (!uid || unpaid.length === 0) return;
    if (
      !confirm(
        `¿Marcar ${unpaid.length} fijos como pagados, sin crear movimientos ni tocar saldos?`,
      )
    ) {
      return;
    }
    await Promise.all(unpaid.map((f) => markFixedPaidWithoutTransaction(uid, f.id)));
  }

  async function handleGenerate() {
    if (!uid) return;
    setGenerating(true);
    try {
      await generateFixedMonthly(uid, month);
    } finally {
      setGenerating(false);
    }
  }

  async function handlePay(input: PayFixedInput) {
    if (!uid || !paying) return;
    await payFixed(uid, paying, input);
  }

  async function handleRevert(fixed: FixedObligationMonthly) {
    if (!uid) return;
    const msg = fixed.transactionId
      ? '¿Deshacer el pago? Se eliminará el movimiento y el dinero volverá a la cuenta de origen.'
      : '¿Deshacer? Volverá a pendiente (no hubo movimiento, no se devuelve dinero).';
    if (!confirm(msg)) return;
    await revertFixedPayment(uid, fixed);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 p-4 pb-24">
      <DisponibleRealBar />
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Fijos</h1>
        <Link to="/mas/fijos" className="text-sm text-slate-400 underline">
          Plantilla
        </Link>
      </header>

      <MonthSelector
        month={month}
        onPrev={() => setMonth(addMonths(month, -1))}
        onNext={() => setMonth(addMonths(month, 1))}
      />
      <FixedTotalsBar totals={totals} />

      {fijos.length > 0 && (
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar fijo…" />
      )}

      {unpaid.length > 1 && (
        <button
          type="button"
          onClick={handleMarkAllPaid}
          className="text-center text-sm text-slate-500 underline"
        >
          Marcar los {unpaid.length} como pagados (sin movimiento)
        </button>
      )}

      {loading && <p className="text-slate-400">Cargando…</p>}

      {!loading && fijos.length === 0 && (
        <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
          {activeTemplates.length > 0 ? (
            <>
              <p className="text-slate-500">No has generado los fijos de este mes.</p>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="mt-3 rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Generar {activeTemplates.length} fijos del mes
              </button>
            </>
          ) : (
            <p className="text-slate-500">
              Aún no tienes plantilla de fijos.{' '}
              <Link to="/mas/fijos" className="font-medium text-slate-700 underline">
                Créala aquí
              </Link>
              .
            </p>
          )}
        </div>
      )}

      {fijos.length > 0 && sorted.length === 0 && (
        <p className="text-slate-500">Ningún fijo coincide con “{search}”.</p>
      )}

      <ul className="flex flex-col gap-2">
        {sorted.map((fixed) => (
          <FixedRow
            key={fixed.id}
            fixed={fixed}
            onAllocate={() => uid && markFixedAllocated(uid, fixed.id)}
            onUnallocate={() => uid && markFixedPending(uid, fixed.id)}
            onPay={() => setPaying(fixed)}
            onMarkPaid={() => uid && markFixedPaidWithoutTransaction(uid, fixed.id)}
            onRevert={() => handleRevert(fixed)}
          />
        ))}
      </ul>

      <PayFixedModal
        open={!!paying}
        fixed={paying}
        accounts={accounts.filter((a) => !a.archived)}
        cards={cards.filter((c) => !c.archived)}
        loans={loans.filter((l) => !l.archived)}
        onClose={() => setPaying(null)}
        onConfirm={handlePay}
      />
    </div>
  );
}
