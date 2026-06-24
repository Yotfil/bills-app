import type { BaseDoc } from './BaseDoc';
import type { Archivable } from './Archivable';

export interface Budget extends BaseDoc, Archivable {
  categoryId: string;
  monthlyLimit: number; // tope
  active: boolean;
  // DERIVADO: lo consumido = Σ gastos de esa categoría en el mes
}
