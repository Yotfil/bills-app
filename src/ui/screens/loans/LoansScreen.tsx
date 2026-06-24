import { useEffect, useState } from 'react';
import { useUserCollection } from '../../hooks/useUserCollection';
import { useFixedMonthly } from '../../hooks/useFixedMonthly';
import { useSessionStore } from '../../../store/sessionStore';
import { LoanCard } from './LoanCard';
import { LoanForm } from './LoanForm';
import { PayLoanModal } from './PayLoanModal';
import { BackButton } from '../../components/BackButton';
import { ConfirmDeleteModal } from '../../components/ConfirmDeleteModal';
import { ReconcileModal } from '../ReconcileModal';
import { entityHasMovements } from '../../../domain/entityUsage';
import { linkedMonthlyCuota, loanHasLinkedFixed } from '../../../domain/loanCuota';
import { archiveLoan, deleteLoan, subscribeLoans } from '../../../data/loanRepository';
import { subscribeAccounts } from '../../../data/accountRepository';
import { subscribeTransactions } from '../../../data/transactionRepository';
import { subscribeFixedTemplates } from '../../../data/fixedTemplateRepository';
import { revertFixedPayment, syncMonthlyAmount } from '../../../data/fixedMonthlyRepository';
import { payLinkedCuota } from '../../../data/loanCuotaService';
import { reconcileLoan } from '../../../data/reconciliationService';
import { currentMonthKey, formatMonthLabel } from '../../../lib/date';
import type { ReconcileTarget } from '../ReconcileTarget';
import type { Account, FixedObligationTemplate, Loan, Transaction } from '../../../domain/types';

// Créditos grandes (CLAUDE.md §5.6, §8.4): progreso de amortización, fecha estimada y abonos.
export function LoansScreen() {
  const uid = useSessionStore((s) => s.user?.uid);
  const { items: loans, loading } = useUserCollection<Loan>(subscribeLoans);
  const { items: accounts } = useUserCollection<Account>(subscribeAccounts);
  const { items: transactions } = useUserCollection<Transaction>(subscribeTransactions);
  const { items: templates } = useUserCollection<FixedObligationTemplate>(subscribeFixedTemplates);
  // Fijos del mes en curso: de ahí se deriva el estado de pago de cada cuota ligada (§5.6).
  const month = currentMonthKey();
  const monthLabel = formatMonthLabel(month);
  const { items: monthlyFixeds } = useFixedMonthly(month);
  const [editing, setEditing] = useState<Loan | null>(null);
  const [paying, setPaying] = useState<Loan | null>(null);
  const [deleting, setDeleting] = useState<Loan | null>(null);
  const [reconciling, setReconciling] = useState<Loan | null>(null);
  const [creating, setCreating] = useState(false);

  const active = loans.filter((l) => !l.archived);

  // Auto-reconciliación (§5.6): la cuota ligada del mes (no pagada) debe reflejar el monto de su
  // plantilla. Si quedó desfasada —p.ej. una instancia generada con el valor viejo que una
  // sincronización previa no alcanzó—, se realinea sola. Converge: tras escribir, la suscripción
  // la trae ya igual y no se vuelve a disparar. Los fijos pagados se respetan (status === 'paid').
  useEffect(() => {
    if (!uid) return;
    for (const loan of loans) {
      if (loan.archived) continue;
      const cuota = linkedMonthlyCuota(loan, monthlyFixeds);
      if (!cuota || cuota.status === 'paid') continue;
      const template = templates.find((t) => t.id === cuota.templateId);
      if (template && template.budgetedAmount !== cuota.budgetedAmount) {
        void syncMonthlyAmount(uid, cuota.templateId, month, template.budgetedAmount);
      }
    }
  }, [uid, loans, templates, monthlyFixeds, month]);

  // Pagar la cuota: 1 toque si está ligada (marca el fijo del mes), o abrir el modal si no.
  function handlePay(loan: Loan, linked: boolean) {
    if (linked) {
      if (uid) void payLinkedCuota(uid, loan, month);
    } else {
      setPaying(loan);
    }
  }

  function handleUndoCuota(loan: Loan) {
    const cuota = linkedMonthlyCuota(loan, monthlyFixeds);
    if (uid && cuota) void revertFixedPayment(uid, cuota);
  }

  async function handleArchive(loan: Loan) {
    if (!uid) return;
    if (!confirm(`¿Archivar el crédito "${loan.name}"? Su histórico se conserva.`)) return;
    await archiveLoan(uid, loan.id);
  }

  // El borrado físico solo procede si el crédito NO tiene abonos (movimientos) asociados (§8.4).
  const deletingBlocked = deleting ? entityHasMovements(transactions, 'loan', deleting.id) : false;

  async function handleDelete() {
    if (!uid || !deleting) return;
    await deleteLoan(uid, deleting.id);
    setDeleting(null);
  }

  async function handleArchiveFromModal() {
    if (!uid || !deleting) return;
    await archiveLoan(uid, deleting.id);
    setDeleting(null);
  }

  // Reconciliar el SALDO del crédito (§5.7): intereses que lo suben, desfases de pruebas, etc.
  const reconcileTarget: ReconcileTarget | null =
    reconciling && uid
      ? {
          id: reconciling.id,
          name: reconciling.name,
          registeredValue: reconciling.cachedBalance,
          registeredLabel: 'Saldo registrado',
          inputLabel: 'Saldo real del crédito (COP)',
          goodDirection: 'decrease', // menos saldo pendiente = verde
          reconcile: (real, note) => reconcileLoan(uid, reconciling, real, note),
        }
      : null;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
      <BackButton />
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Créditos</h1>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white"
        >
          + Nuevo
        </button>
      </header>

      {loading && <p className="text-slate-400">Cargando…</p>}
      {!loading && active.length === 0 && (
        <p className="text-slate-500">Aún no tienes créditos registrados.</p>
      )}

      <ul className="flex flex-col gap-3">
        {active.map((loan) => {
          const linked = loanHasLinkedFixed(loan, templates);
          const cuota = linkedMonthlyCuota(loan, monthlyFixeds);
          return (
            <LoanCard
              key={loan.id}
              loan={loan}
              linked={linked}
              cuotaPaid={cuota?.status === 'paid'}
              monthLabel={monthLabel}
              onPay={() => handlePay(loan, linked)}
              onUndoCuota={() => handleUndoCuota(loan)}
              onEdit={() => setEditing(loan)}
              onReconcile={() => setReconciling(loan)}
              onArchive={() => handleArchive(loan)}
              onDelete={() => setDeleting(loan)}
            />
          );
        })}
      </ul>

      <LoanForm key={`create-${creating}`} open={creating} onClose={() => setCreating(false)} />
      <LoanForm
        key={editing?.id ?? 'edit-none'}
        open={!!editing}
        loan={editing}
        onClose={() => setEditing(null)}
      />
      <PayLoanModal
        open={!!paying}
        loan={paying}
        accounts={accounts.filter((a) => !a.archived)}
        onClose={() => setPaying(null)}
      />
      <ConfirmDeleteModal
        open={!!deleting}
        itemLabel={deleting?.name ?? ''}
        itemKind="el crédito"
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
