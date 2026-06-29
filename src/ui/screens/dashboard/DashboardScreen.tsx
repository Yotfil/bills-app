import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUserCollection } from '../../hooks/useUserCollection';
import { useFixedMonthly } from '../../hooks/useFixedMonthly';
import { subscribeAccounts } from '../../../data/accountRepository';
import { subscribeCards } from '../../../data/cardRepository';
import { subscribeLoans } from '../../../data/loanRepository';
import { subscribeCategories } from '../../../data/categoryRepository';
import { subscribeTransactions } from '../../../data/transactionRepository';
import { subscribeBudgets } from '../../../data/budgetRepository';
import { subscribeAllocatedFixeds } from '../../../data/fixedMonthlyRepository';
import { disponibleReal } from '../../../domain/derived';
import { fixedTotals } from '../../../domain/fixed';
import { budgetStatus, spendByCategory } from '../../../domain/reports';
import {
  budgetCapForMonth,
  budgetForCategory,
  exceededBudgetBacked,
  nearLimitBudgetBacked,
} from '../../../domain/budgetBackedFixed';
import { monthlySummary } from '../../../domain/summary';
import { addMonths, currentMonthKey, monthKey, transactionPeriodMonth } from '../../../lib/date';
import { NEAR_LIMIT_RATIO } from '../../../lib/progress';
import { MonthSelector } from '../../components/MonthSelector';
import { HeroBalance } from './HeroBalance';
import { ExceededBudgetsAlert } from './ExceededBudgetsAlert';
import { NearLimitBudgetsAlert } from './NearLimitBudgetsAlert';
import { HormigaCard } from './HormigaCard';
import { MonthSummaryCard } from './MonthSummaryCard';
import { FixedProgressCard } from './FixedProgressCard';
import { CategoryDonut } from './CategoryDonut';
import { ExchangeRateNote } from './ExchangeRateNote';
import type {
  Account,
  Budget,
  Category,
  CreditCard,
  FixedObligationMonthly,
  Loan,
  Transaction,
} from '../../../domain/types';

// Dashboard / Inicio (CLAUDE.md §8.1). Debe entenderse en < 5 segundos: número-héroe,
// resumen del mes, fijos y dona por categoría, con selector de periodo (mes actual).
export function DashboardScreen() {
  const navigate = useNavigate();
  const { items: accounts, loading: accountsLoading } = useUserCollection<Account>(subscribeAccounts);
  const { items: cards, loading: cardsLoading } = useUserCollection<CreditCard>(subscribeCards);
  const { items: loans, loading: loansLoading } = useUserCollection<Loan>(subscribeLoans);
  const { items: transactions } = useUserCollection<Transaction>(subscribeTransactions);
  const { items: categories } = useUserCollection<Category>(subscribeCategories);
  const { items: budgets } = useUserCollection<Budget>(subscribeBudgets);
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
  // El número-héroe (disponible real) es un número de "hoy", no del periodo del selector. Su
  // reservado = TODO lo destinado y no pagado, de cualquier mes (§5.1, §5.2): así destinar un mes
  // futuro baja ya el disponible (el dinero está apartado aunque el fijo se pague después).
  const { items: allocatedFixeds } =
    useUserCollection<FixedObligationMonthly>(subscribeAllocatedFixeds);
  const available = disponibleReal(activeAccounts, allocatedFixeds);
  // Saldo total: TODO lo que hay, incluido lo de Ahorros (a diferencia del disponible real).
  const totalBalance = activeAccounts.reduce((sum, a) => sum + a.cachedBalance, 0);
  // Los fijos del Inicio (progreso y alertas) SÍ siguen el mes del selector: cada mes tiene su
  // propia instancia de fijos. Si el mes no tiene fijos generados (sin plantilla aplicada aún), la
  // tarjeta de progreso se oculta (no se muestra nada del feature para ese mes).
  const { items: selectedFixeds } = useFixedMonthly(month);
  const ft = fixedTotals(selectedFixeds);

  // Caja del mes (resumen y dona): por FECHA real del movimiento (cuándo entró/salió la plata).
  const monthTxns = useMemo(
    () => transactions.filter((t) => monthKey(t.date) === month),
    [transactions, month],
  );
  // Presupuestos del mes: por MES CONTABLE (periodMonth), así un fijo pagado por adelantado consume
  // el presupuesto de su mes, no el de la fecha de pago (§5.9). Distinto del de caja a propósito.
  const budgetMonthTxns = useMemo(
    () => transactions.filter((t) => transactionPeriodMonth(t) === month),
    [transactions, month],
  );
  const summary = useMemo(() => monthlySummary(monthTxns), [monthTxns]);

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // Tope del mes por categoría: vive en su `Budget` (§5.9, Opción B).
  const capOf = useMemo(() => {
    return (categoryId: string): number => {
      const b = budgetForCategory(categoryId, budgets);
      return b ? budgetCapForMonth(b, month) : 0;
    };
  }, [budgets, month]);
  const consumedOf = (categoryId: string) => budgetStatus(budgetMonthTxns, categoryId, 0).consumed;

  // Topes excedidos del mes del selector: fijos respaldados cuyo gasto superó el tope (§5.9).
  // Alimenta la alerta del Inicio, que solo aparece si la lista no está vacía.
  const exceededItems = useMemo(
    () =>
      exceededBudgetBacked(selectedFixeds, consumedOf, capOf).map((e) => ({
        id: e.fixed.id,
        categoryName: categoryById.get(e.fixed.categoryId)?.name ?? 'Categoría',
        overspend: e.overspend,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedFixeds, budgetMonthTxns, categoryById, capOf],
  );
  // Topes muy cerca de excederse (sin pasarse aún): alerta preventiva (naranja).
  const nearLimitItems = useMemo(
    () =>
      nearLimitBudgetBacked(selectedFixeds, consumedOf, capOf, NEAR_LIMIT_RATIO).map((n) => ({
        id: n.fixed.id,
        categoryName: categoryById.get(n.fixed.categoryId)?.name ?? 'Categoría',
        remaining: n.remaining,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedFixeds, budgetMonthTxns, categoryById, capOf],
  );

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

      {/* Alertas de topes: excedidos (rojo) y cerca de excederse (naranja). Arriba para máxima
          visibilidad; cada una solo aparece si tiene ítems. */}
      <ExceededBudgetsAlert items={exceededItems} />
      <NearLimitBudgetsAlert items={nearLimitItems} />
      <HormigaCard month={month} />

      <MonthSummaryCard summary={summary} />
      {/* La tarjeta de fijos solo se muestra si el mes tiene fijos generados; en el mes en curso se
          conserva aunque esté vacío para ofrecer el acceso a configurarlos (§7). */}
      {(selectedFixeds.length > 0 || month === currentMonthKey()) && (
        <FixedProgressCard
          paid={ft.counts.paid}
          allocated={ft.counts.allocated}
          pending={ft.counts.pending}
          total={ft.counts.total}
        />
      )}
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
