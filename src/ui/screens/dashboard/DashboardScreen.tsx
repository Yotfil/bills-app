import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUserCollection } from '../../hooks/useUserCollection';
import { useFixedMonthly } from '../../hooks/useFixedMonthly';
import { subscribeAccounts } from '../../../data/accountRepository';
import { subscribeCards } from '../../../data/cardRepository';
import { subscribeLoans } from '../../../data/loanRepository';
import { subscribeCategories } from '../../../data/categoryRepository';
import { subscribeTransactions } from '../../../data/transactionRepository';
import { disponibleReal } from '../../../domain/derived';
import { fixedTotals } from '../../../domain/fixed';
import { spendByCategory } from '../../../domain/reports';
import { monthlySummary } from '../../../domain/summary';
import { addMonths, currentMonthKey, monthKey } from '../../../lib/date';
import { MonthSelector } from '../../components/MonthSelector';
import { HeroBalance } from './HeroBalance';
import { MonthSummaryCard } from './MonthSummaryCard';
import { FixedProgressCard } from './FixedProgressCard';
import { CategoryDonut } from './CategoryDonut';
import { ExchangeRateNote } from './ExchangeRateNote';
import type { Account, Category, CreditCard, Loan, Transaction } from '../../../domain/types';

// Dashboard / Inicio (CLAUDE.md §8.1). Debe entenderse en < 5 segundos: número-héroe,
// resumen del mes, fijos y dona por categoría, con selector de periodo (mes actual).
export function DashboardScreen() {
  const navigate = useNavigate();
  const { items: accounts, loading: accountsLoading } = useUserCollection<Account>(subscribeAccounts);
  const { items: cards, loading: cardsLoading } = useUserCollection<CreditCard>(subscribeCards);
  const { items: loans, loading: loansLoading } = useUserCollection<Loan>(subscribeLoans);
  const { items: transactions } = useUserCollection<Transaction>(subscribeTransactions);
  const { items: categories } = useUserCollection<Category>(subscribeCategories);
  const [month, setMonth] = useState(currentMonthKey());

  const activeAccounts = accounts.filter((a) => !a.archived);

  // El acceso al onboarding solo aparece cuando NO hay NADA registrado todavía (ni cuentas, ni
  // tarjetas, ni créditos). En cuanto se registra algo, desaparece del Inicio (vive siempre en
  // Más). Se espera a que las tres colecciones carguen para no parpadear en el primer render.
  const nothingRegistered =
    !accountsLoading &&
    !cardsLoading &&
    !loansLoading &&
    accounts.length === 0 &&
    cards.length === 0 &&
    loans.length === 0;
  // El número-héroe y el progreso de fijos son del MES ACTUAL (no del periodo del selector,
  // que solo filtra el resumen y la dona). El reservado se deriva de los fijos 'allocated'.
  const { items: monthlyFixeds } = useFixedMonthly(currentMonthKey());
  const available = disponibleReal(activeAccounts, monthlyFixeds);
  // Saldo total: TODO lo que hay, incluido lo de Ahorros (a diferencia del disponible real).
  const totalBalance = activeAccounts.reduce((sum, a) => sum + a.cachedBalance, 0);
  const ft = fixedTotals(monthlyFixeds);

  const monthTxns = useMemo(
    () => transactions.filter((t) => monthKey(t.date) === month),
    [transactions, month],
  );
  const summary = useMemo(() => monthlySummary(monthTxns), [monthTxns]);

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const slices = useMemo(() => {
    const byCat = spendByCategory(monthTxns);
    return Object.entries(byCat)
      .map(([id, value]) => {
        const cat = categoryById.get(id);
        return { id, name: cat?.name ?? 'Otros', value, color: cat?.color ?? '#94a3b8' };
      })
      .sort((a, b) => b.value - a.value);
  }, [monthTxns, categoryById]);

  // Estado vacío (§7): mientras no haya NADA registrado, el Inicio se enfoca en una sola acción
  // —configurar los datos— y oculta el resto del dashboard (resumen, fijos, dona…), que aún no
  // tendría nada que mostrar. El acceso sigue siempre disponible desde Más.
  if (nothingRegistered) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-3 p-4 pb-24">
        <MonthSelector
          month={month}
          onPrev={() => setMonth(addMonths(month, -1))}
          onNext={() => setMonth(addMonths(month, 1))}
        />
        <HeroBalance amount={available} total={totalBalance} />
        <p className="px-4 pt-2 text-center text-sm text-slate-400">
          Aún no tienes nada registrado. Empieza configurando tus cuentas, tarjetas y créditos.
        </p>
        <Link
          to="/onboarding"
          className="rounded-2xl border border-dashed border-slate-600 bg-slate-800 p-3.5 text-center text-sm font-medium text-white"
        >
          ⚙️ Configurar mis datos · volver a los 5 pasos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 p-4 pb-24">
      <MonthSelector
        month={month}
        onPrev={() => setMonth(addMonths(month, -1))}
        onNext={() => setMonth(addMonths(month, 1))}
      />

      <HeroBalance amount={available} total={totalBalance} />

      <MonthSummaryCard summary={summary} />
      <FixedProgressCard
        paid={ft.counts.paid}
        allocated={ft.counts.allocated}
        pending={ft.counts.pending}
        total={ft.counts.total}
      />
      <CategoryDonut
        slices={slices}
        total={summary.expense}
        onSelect={(categoryId) => navigate(`/registro?cat=${categoryId}`)}
      />

      <Link to="/registro" className="py-2 text-center text-sm text-slate-500 underline">
        Ver todo el registro
      </Link>

      {/* Tasa del dólar (USD→COP): referencia discreta, informativa (§5.11). */}
      <ExchangeRateNote />
    </div>
  );
}
