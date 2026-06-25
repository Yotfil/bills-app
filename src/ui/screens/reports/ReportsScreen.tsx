import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserCollection } from '../../hooks/useUserCollection';
import { subscribeTransactions } from '../../../data/transactionRepository';
import { subscribeCategories } from '../../../data/categoryRepository';
import { monthlyInsights, topCategories } from '../../../domain/insights';
import { monthKey, recentMonthKeys } from '../../../lib/date';
import { BackButton } from '../../components/BackButton';
import { MonthlyTrendChart } from './MonthlyTrendChart';
import { TopCategoriesList } from './TopCategoriesList';
import { HormigaTrendChart } from './HormigaTrendChart';
import type { Category, Transaction } from '../../../domain/types';
import type { TopCategoryRow } from './TopCategoriesListProps';

const WINDOW_OPTIONS = [6, 12] as const;
const TOP_CATEGORIES_LIMIT = 8;

// Reportes / insights (CLAUDE.md §15): tendencias mes a mes, top categorías y gasto hormiga
// histórico. Toda la agregación es pura (domain/insights); aquí solo se alimenta y se dibuja.
export function ReportsScreen() {
  const navigate = useNavigate();
  const { items: transactions } = useUserCollection<Transaction>(subscribeTransactions);
  const { items: categories } = useUserCollection<Category>(subscribeCategories);
  const [windowSize, setWindowSize] = useState<number>(6);

  const months = useMemo(() => recentMonthKeys(windowSize), [windowSize]);

  const insights = useMemo(
    () => monthlyInsights(transactions, months, (t) => monthKey(t.date)),
    [transactions, months],
  );

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // Top categorías sobre los movimientos del periodo (no solo del mes actual).
  const topRows = useMemo<TopCategoryRow[]>(() => {
    const monthSet = new Set(months);
    const windowTxns = transactions.filter((t) => monthSet.has(monthKey(t.date)));
    return topCategories(windowTxns, TOP_CATEGORIES_LIMIT).map((c) => {
      const cat = categoryById.get(c.categoryId);
      return {
        categoryId: c.categoryId,
        name: cat?.name ?? 'Otros',
        color: cat?.color ?? '#94a3b8',
        total: c.total,
      };
    });
  }, [transactions, months, categoryById]);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
      <BackButton />
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Reportes</h1>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {WINDOW_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setWindowSize(n)}
              className={`rounded-md px-3 py-1 text-sm font-medium ${
                windowSize === n ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
              }`}
            >
              {n} meses
            </button>
          ))}
        </div>
      </header>

      <MonthlyTrendChart data={insights} />
      <TopCategoriesList
        rows={topRows}
        onSelect={(categoryId) => navigate(`/registro?cat=${categoryId}`)}
      />
      <HormigaTrendChart data={insights} />
    </div>
  );
}
