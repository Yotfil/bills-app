import { useState } from 'react';
import { useUserCollection } from '../../hooks/useUserCollection';
import { useSessionStore } from '../../../store/sessionStore';
import { LoanCard } from './LoanCard';
import { LoanForm } from './LoanForm';
import { PayLoanModal } from './PayLoanModal';
import { BackButton } from '../../components/BackButton';
import { ConfirmDeleteModal } from '../../components/ConfirmDeleteModal';
import { entityHasMovements } from '../../../domain/entityUsage';
import { archiveLoan, deleteLoan, subscribeLoans } from '../../../data/loanRepository';
import { subscribeAccounts } from '../../../data/accountRepository';
import { subscribeTransactions } from '../../../data/transactionRepository';
import type { Account, Loan, Transaction } from '../../../domain/types';

// Créditos grandes (CLAUDE.md §5.6, §8.4): progreso de amortización, fecha estimada y abonos.
export function LoansScreen() {
  const uid = useSessionStore((s) => s.user?.uid);
  const { items: loans, loading } = useUserCollection<Loan>(subscribeLoans);
  const { items: accounts } = useUserCollection<Account>(subscribeAccounts);
  const { items: transactions } = useUserCollection<Transaction>(subscribeTransactions);
  const [editing, setEditing] = useState<Loan | null>(null);
  const [paying, setPaying] = useState<Loan | null>(null);
  const [deleting, setDeleting] = useState<Loan | null>(null);
  const [creating, setCreating] = useState(false);

  const active = loans.filter((l) => !l.archived);

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
        {active.map((loan) => (
          <LoanCard
            key={loan.id}
            loan={loan}
            onPay={() => setPaying(loan)}
            onEdit={() => setEditing(loan)}
            onArchive={() => handleArchive(loan)}
            onDelete={() => setDeleting(loan)}
          />
        ))}
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
    </div>
  );
}
