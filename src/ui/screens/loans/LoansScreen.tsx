import { useState } from 'react';
import { useUserCollection } from '../../hooks/useUserCollection';
import { useSessionStore } from '../../../store/sessionStore';
import { LoanCard } from './LoanCard';
import { LoanForm } from './LoanForm';
import { PayLoanModal } from './PayLoanModal';
import { archiveLoan, subscribeLoans } from '../../../data/loanRepository';
import { subscribeAccounts } from '../../../data/accountRepository';
import type { Account, Loan } from '../../../domain/types';

// Créditos grandes (CLAUDE.md §5.6, §8.4): progreso de amortización, fecha estimada y abonos.
export function LoansScreen() {
  const uid = useSessionStore((s) => s.user?.uid);
  const { items: loans, loading } = useUserCollection<Loan>(subscribeLoans);
  const { items: accounts } = useUserCollection<Account>(subscribeAccounts);
  const [editing, setEditing] = useState<Loan | null>(null);
  const [paying, setPaying] = useState<Loan | null>(null);
  const [creating, setCreating] = useState(false);

  const active = loans.filter((l) => !l.archived);

  async function handleArchive(loan: Loan) {
    if (!uid) return;
    if (!confirm(`¿Archivar el crédito "${loan.name}"? Su histórico se conserva.`)) return;
    await archiveLoan(uid, loan.id);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
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
          />
        ))}
      </ul>

      <LoanForm open={creating} onClose={() => setCreating(false)} />
      <LoanForm open={!!editing} loan={editing} onClose={() => setEditing(null)} />
      <PayLoanModal
        open={!!paying}
        loan={paying}
        accounts={accounts.filter((a) => !a.archived)}
        onClose={() => setPaying(null)}
      />
    </div>
  );
}
