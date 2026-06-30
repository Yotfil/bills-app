import { Fragment } from 'react';
import { FixedRow } from './FixedRow';
import { BudgetChecklistCard } from '../budgets/BudgetChecklistCard';
import { HormigaBudgetCard } from '../budgets/HormigaBudgetCard';
import {
  budgetCapForMonth,
  budgetManuallyPaid,
  linkedBudgetItems,
} from '../../../domain/budgetBackedFixed';
import type { FixedBudgetsTabProps } from './FixedBudgetsTabProps';

// Pestaña Presupuestos de Fijos (§8.3): SOLO los presupuestos marcados "Mostrar en Fijos", cada uno
// con su bolsa anidada (ítems que consumen ese presupuesto), más el gasto hormiga. No se pagan con
// movimiento; su tope cuenta en los totales de arriba.
export function FixedBudgetsTab({
  budgets,
  month,
  activeFijos,
  consumedForCategory,
  compareFixed,
  categoryName,
  onEditCap,
  onBudgetMarkPaid,
  onBudgetUndoPaid,
  rowProps,
}: FixedBudgetsTabProps) {
  return (
    <ul className="flex flex-col gap-2">
      {budgets.map((b) => {
        const items = linkedBudgetItems(b.categoryId, activeFijos).sort(compareFixed);
        return (
          <Fragment key={b.id}>
            <BudgetChecklistCard
              categoryName={categoryName(b.categoryId) ?? 'Categoría'}
              cap={budgetCapForMonth(b, month)}
              consumed={consumedForCategory(b.categoryId)}
              manuallyPaid={budgetManuallyPaid(b, month)}
              onEditCap={() => onEditCap(b)}
              onMarkPaid={() => onBudgetMarkPaid(b)}
              onUndoPaid={() => onBudgetUndoPaid(b)}
            />
            {items.map((it) => (
              <FixedRow key={it.id} {...rowProps(it, { nested: true })} />
            ))}
          </Fragment>
        );
      })}
      <HormigaBudgetCard month={month} />
    </ul>
  );
}
