import type { BaseDoc } from './BaseDoc';
import type { Archivable } from './Archivable';

export interface Budget extends BaseDoc, Archivable {
  categoryId: string;
  monthlyLimit: number; // tope BASE: con lo que arranca cada mes (la "plantilla")
  active: boolean;
  // Override del tope para un mes concreto ('YYYY-MM' → monto), editable en la vista mensual sin
  // afectar la base ni los otros meses (§5.9). Ausente = ese mes usa `monthlyLimit`. Tope efectivo
  // del mes = `monthlyOverrides?.[month] ?? monthlyLimit` (helper `budgetCapForMonth`).
  monthlyOverrides?: Record<string, number>;
  // DERIVADO: lo consumido = Σ gastos de esa categoría en el mes
}
