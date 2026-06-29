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
  // Aparece en el checklist mensual de Fijos y su tope cuenta en los totales "Por destinar"/"Pagado"
  // (§5.9). Reemplaza el viejo "fijo respaldado": un presupuesto de checklist no se paga con un
  // movimiento; su gasto real son los movimientos de su categoría. Ausente/false = solo es un tope
  // (no aparece en Fijos, no cuenta en los totales).
  inChecklist?: boolean;
  // "Ya estaba pagado (sin movimiento)" POR MES ('YYYY-MM' → true) para un presupuesto de checklist:
  // se marca lleno a mano aunque el gasto no alcance el tope (útil para meses ya saldados). Ausente
  // para un mes = el estado se deriva del consumo (lleno si consumido ≥ tope).
  manualPaidMonths?: Record<string, true>;
  // DERIVADO: lo consumido = Σ gastos de esa categoría en el mes
}
