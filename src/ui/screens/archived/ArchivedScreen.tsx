import { useUserCollection } from '../../hooks/useUserCollection';
import { useSessionStore } from '../../../store/sessionStore';
import { BackButton } from '../../components/BackButton';
import { ArchivedSection } from './ArchivedSection';
import { ArchivedItemRow } from './ArchivedItemRow';
import { formatCop } from '../../../lib/currency';
import { entityHasMovements } from '../../../domain/entityUsage';
import {
  deleteAccount,
  subscribeAccounts,
  unarchiveAccount,
} from '../../../data/accountRepository';
import { deleteCard, subscribeCards, unarchiveCard } from '../../../data/cardRepository';
import { deleteLoan, subscribeLoans, unarchiveLoan } from '../../../data/loanRepository';
import { deleteBudget, subscribeBudgets, unarchiveBudget } from '../../../data/budgetRepository';
import {
  deleteFixedTemplate,
  subscribeFixedTemplates,
  unarchiveFixedTemplate,
} from '../../../data/fixedTemplateRepository';
import { subscribeCategories } from '../../../data/categoryRepository';
import { subscribeTransactions } from '../../../data/transactionRepository';
import type {
  Account,
  AccountType,
  Budget,
  Category,
  CreditCard,
  FixedObligationTemplate,
  Loan,
  Transaction,
} from '../../../domain/types';

const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  savings: 'Ahorros',
  cash: 'Efectivo',
  term_deposit: 'CDT / Inversión',
};

// Movimientos asociados (§8.4): una cuenta/tarjeta/crédito referenciada por algún movimiento
// no se puede borrar sin romper el histórico; se queda archivada.
const HAS_MOVEMENTS_REASON = 'Tiene movimientos';

// Sección "Archivados" (§8.4): muestra lo archivado de cada sección por separado y permite
// desarchivar o eliminar definitivamente. El borrado físico se bloquea cuando hay histórico.
export function ArchivedScreen() {
  const uid = useSessionStore((s) => s.user?.uid);
  const { items: accounts } = useUserCollection<Account>(subscribeAccounts);
  const { items: cards } = useUserCollection<CreditCard>(subscribeCards);
  const { items: loans } = useUserCollection<Loan>(subscribeLoans);
  const { items: budgets } = useUserCollection<Budget>(subscribeBudgets);
  const { items: templates } = useUserCollection<FixedObligationTemplate>(subscribeFixedTemplates);
  const { items: categories } = useUserCollection<Category>(subscribeCategories);
  const { items: transactions } = useUserCollection<Transaction>(subscribeTransactions);

  const archivedAccounts = accounts.filter((a) => a.archived);
  const cuentas = archivedAccounts.filter((a) => !(a.savingsBucket ?? false));
  const ahorros = archivedAccounts.filter((a) => a.savingsBucket ?? false);
  const archivedCards = cards.filter((c) => c.archived);
  const archivedLoans = loans.filter((l) => l.archived);
  const archivedBudgets = budgets.filter((b) => b.archived);
  const archivedTemplates = templates.filter((t) => t.archived);

  const total =
    archivedAccounts.length +
    archivedCards.length +
    archivedLoans.length +
    archivedBudgets.length +
    archivedTemplates.length;

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? 'Categoría';

  function restore(fn: (uid: string, id: string) => Promise<void>, id: string) {
    if (!uid) return;
    void fn(uid, id);
  }

  function remove(fn: (uid: string, id: string) => Promise<void>, id: string, label: string) {
    if (!uid) return;
    if (!confirm(`¿Eliminar definitivamente "${label}"? Esta acción no se puede deshacer.`)) return;
    void fn(uid, id);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 p-4 pb-24">
      <BackButton />
      <h1 className="text-xl font-bold text-slate-800">Archivados</h1>

      {total === 0 && (
        <p className="text-slate-500">No tienes nada archivado. Lo que archives aparecerá aquí.</p>
      )}

      {cuentas.length > 0 && (
        <ArchivedSection title="Cuentas">
          {cuentas.map((a) => {
            const blocked = entityHasMovements(transactions, 'account', a.id);
            return (
              <ArchivedItemRow
                key={a.id}
                label={a.name}
                sublabel={`${ACCOUNT_TYPE_LABEL[a.type]} · ${formatCop(a.cachedBalance)}`}
                onRestore={() => restore(unarchiveAccount, a.id)}
                onDelete={blocked ? undefined : () => remove(deleteAccount, a.id, a.name)}
                deleteBlockedReason={blocked ? HAS_MOVEMENTS_REASON : undefined}
              />
            );
          })}
        </ArchivedSection>
      )}

      {ahorros.length > 0 && (
        <ArchivedSection title="Ahorros">
          {ahorros.map((a) => {
            const blocked = entityHasMovements(transactions, 'account', a.id);
            return (
              <ArchivedItemRow
                key={a.id}
                label={a.name}
                sublabel={`${ACCOUNT_TYPE_LABEL[a.type]} · ${formatCop(a.cachedBalance)}`}
                onRestore={() => restore(unarchiveAccount, a.id)}
                onDelete={blocked ? undefined : () => remove(deleteAccount, a.id, a.name)}
                deleteBlockedReason={blocked ? HAS_MOVEMENTS_REASON : undefined}
              />
            );
          })}
        </ArchivedSection>
      )}

      {archivedCards.length > 0 && (
        <ArchivedSection title="Tarjetas">
          {archivedCards.map((c) => {
            const blocked = entityHasMovements(transactions, 'card', c.id);
            return (
              <ArchivedItemRow
                key={c.id}
                label={c.name}
                sublabel={`Deuda ${formatCop(c.cachedDebt)}`}
                onRestore={() => restore(unarchiveCard, c.id)}
                onDelete={blocked ? undefined : () => remove(deleteCard, c.id, c.name)}
                deleteBlockedReason={blocked ? HAS_MOVEMENTS_REASON : undefined}
              />
            );
          })}
        </ArchivedSection>
      )}

      {archivedLoans.length > 0 && (
        <ArchivedSection title="Créditos">
          {archivedLoans.map((l) => {
            const blocked = entityHasMovements(transactions, 'loan', l.id);
            return (
              <ArchivedItemRow
                key={l.id}
                label={l.name}
                sublabel={`Saldo ${formatCop(l.cachedBalance)}`}
                onRestore={() => restore(unarchiveLoan, l.id)}
                onDelete={blocked ? undefined : () => remove(deleteLoan, l.id, l.name)}
                deleteBlockedReason={blocked ? HAS_MOVEMENTS_REASON : undefined}
              />
            );
          })}
        </ArchivedSection>
      )}

      {archivedTemplates.length > 0 && (
        <ArchivedSection title="Obligaciones fijas">
          {archivedTemplates.map((t) => (
            <ArchivedItemRow
              key={t.id}
              label={t.name}
              sublabel={`${formatCop(t.budgetedAmount)} · ${
                t.payKind === 'debt_payment' ? 'Abono a deuda' : categoryName(t.categoryId)
              }`}
              onRestore={() => restore(unarchiveFixedTemplate, t.id)}
              onDelete={() => remove(deleteFixedTemplate, t.id, t.name)}
            />
          ))}
        </ArchivedSection>
      )}

      {archivedBudgets.length > 0 && (
        <ArchivedSection title="Presupuestos">
          {archivedBudgets.map((b) => (
            <ArchivedItemRow
              key={b.id}
              label={categoryName(b.categoryId)}
              sublabel={`Tope ${formatCop(b.monthlyLimit)}`}
              onRestore={() => restore(unarchiveBudget, b.id)}
              onDelete={() => remove(deleteBudget, b.id, categoryName(b.categoryId))}
            />
          ))}
        </ArchivedSection>
      )}
    </div>
  );
}
