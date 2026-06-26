import type { FixedObligationMonthly } from '../../../domain/types';

export interface FixedRowProps {
  fixed: FixedObligationMonthly;
  onAllocate: () => void; // pendiente → destinado
  onUnallocate: () => void; // destinado → pendiente (deshacer)
  onPay: () => void; // abrir el flujo de pago (crea movimiento)
  onMarkPaid: () => void; // marcar pagado SIN movimiento ("ya estaba pagado")
  onRevert: () => void; // deshacer el pago (devuelve el dinero si hubo movimiento)
  // Fijo respaldado por presupuesto (§5.9): si `fixed.budgetBacked`, se muestra una barra de
  // progreso (gastado/tope) en vez de los botones de pago. `budgetCap` es el tope del presupuesto
  // (espejo del monto); `budgetConsumed` lo gastado de la categoría este mes.
  budgetConsumed?: number;
  budgetCap?: number;
  onEditCap?: () => void; // editar el tope desde el fijo (espejo con el presupuesto)
  // Selección para acciones masivas (opcional). Si se pasa onToggleSelect, se muestra el checkbox.
  selected?: boolean;
  onToggleSelect?: () => void;
}
