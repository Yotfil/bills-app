import { BudgetMonthCard } from '../budgets/BudgetMonthCard';
import { HormigaBudgetCard } from '../budgets/HormigaBudgetCard';
import { budgetStatus } from '../../../domain/reports';
import { budgetCapForMonth } from '../../../domain/budgetBackedFixed';
import type { BudgetsMonthSectionProps } from './BudgetsMonthSectionProps';

// Sección MENSUAL de presupuestos NORMALES + gasto hormiga, dentro de la pestaña Presupuestos de
// /fijos (§5.9, §5.8): barra de consumo del mes y "Editar tope" (override de SOLO ese mes). No son
// obligaciones: no entran en los totales ni en las acciones masivas de Fijos.
export function BudgetsMonthSection({
  month,
  budgets,
  monthTxns,
  categoryNameOf,
  onEditCap,
  onResetCap,
}: BudgetsMonthSectionProps) {
  return (
    <ul className="flex flex-col gap-2">
      {budgets.map((b) => (
        <BudgetMonthCard
          key={b.id}
          categoryName={categoryNameOf(b.categoryId)}
          status={budgetStatus(monthTxns, b.categoryId, budgetCapForMonth(b, month))}
          overridden={b.monthlyOverrides?.[month] != null}
          onEditCap={() => onEditCap(b)}
          onResetCap={() => onResetCap(b)}
        />
      ))}
      <HormigaBudgetCard month={month} />
    </ul>
  );
}
