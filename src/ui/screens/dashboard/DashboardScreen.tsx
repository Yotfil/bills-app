import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUserCollection } from '../../hooks/useUserCollection';
import { useFixedMonthly } from '../../hooks/useFixedMonthly';
import { subscribeAccounts } from '../../../data/accountRepository';
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
import type { Account, Category, Transaction } from '../../../domain/types';

// Dashboard / Inicio (CLAUDE.md §8.1). Debe entenderse en < 5 segundos: número-héroe,
// resumen del mes, fijos y dona por categoría, con selector de periodo (mes actual).
export function DashboardScreen() {
  const navigate = useNavigate();
  const { items: accounts } = useUserCollection<Account>(subscribeAccounts);
  const { items: transactions } = useUserCollection<Transaction>(subscribeTransactions);
  const { items: categories } = useUserCollection<Category>(subscribeCategories);
  const [month, setMonth] = useState(currentMonthKey());

  const activeAccounts = accounts.filter((a) => !a.archived);
  // El número-héroe y el progreso de fijos son del MES ACTUAL (no del periodo del selector,
  // que solo filtra el resumen y la dona). El reservado se deriva de los fijos 'allocated'.
  const { items: monthlyFixeds } = useFixedMonthly(currentMonthKey());
  const available = disponibleReal(activeAccounts, monthlyFixeds);
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

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 p-4 pb-24">
      <MonthSelector
        month={month}
        onPrev={() => setMonth(addMonths(month, -1))}
        onNext={() => setMonth(addMonths(month, 1))}
      />

      <HeroBalance amount={available} />

      {/* Acceso para configurar/sembrar datos y volver a los 5 pasos del onboarding (§7). */}
      <Link
        to="/onboarding"
        className="rounded-2xl border border-dashed border-slate-300 bg-white p-3 text-center text-sm font-medium text-slate-600"
      >
        ⚙️ Configurar mis datos · volver a los 5 pasos
      </Link>

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
