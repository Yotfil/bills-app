import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUserCollection } from '../../hooks/useUserCollection';
import { subscribeAccounts } from '../../../data/accountRepository';
import { subscribeCategories } from '../../../data/categoryRepository';
import { subscribeTransactions } from '../../../data/transactionRepository';
import { disponibleReal } from '../../../domain/derived';
import { spendByCategory } from '../../../domain/reports';
import { monthlySummary } from '../../../domain/summary';
import { addMonths, currentMonthKey, monthKey } from '../../../lib/date';
import { MonthSelector } from './MonthSelector';
import { HeroBalance } from './HeroBalance';
import { MonthSummaryCard } from './MonthSummaryCard';
import { FixedProgressCard } from './FixedProgressCard';
import { CategoryDonut } from './CategoryDonut';
import type { Account, Category, FixedObligationMonthly, Transaction } from '../../../domain/types';

// Dashboard / Inicio (CLAUDE.md §8.1). Debe entenderse en < 5 segundos: número-héroe,
// resumen del mes, fijos y dona por categoría, con selector de periodo (mes actual).
export function DashboardScreen() {
  const navigate = useNavigate();
  const { items: accounts } = useUserCollection<Account>(subscribeAccounts);
  const { items: transactions } = useUserCollection<Transaction>(subscribeTransactions);
  const { items: categories } = useUserCollection<Category>(subscribeCategories);
  const [month, setMonth] = useState(currentMonthKey());

  const activeAccounts = accounts.filter((a) => !a.archived);
  // El reservado real saldrá de los fijos del mes (§5.2); llega con el Paso 9.
  const monthlyFixeds: FixedObligationMonthly[] = [];
  const available = disponibleReal(activeAccounts, monthlyFixeds);

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
      <MonthSummaryCard summary={summary} />
      <FixedProgressCard paid={0} allocated={0} pending={0} total={monthlyFixeds.length} />
      <CategoryDonut
        slices={slices}
        total={summary.expense}
        onSelect={(categoryId) => navigate(`/registro?cat=${categoryId}`)}
      />

      <Link to="/registro" className="py-2 text-center text-sm text-slate-500 underline">
        Ver todo el registro
      </Link>

      {/* Tasa del dólar (USD→COP): referencia discreta. Servicio con caché llega en el Paso 13. */}
      <p className="text-center text-xs text-slate-300">Tasa USD→COP · disponible pronto</p>
    </div>
  );
}
