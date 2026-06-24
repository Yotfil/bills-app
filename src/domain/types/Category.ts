import type { BaseDoc } from './BaseDoc';
import type { Archivable } from './Archivable';

export interface Category extends BaseDoc, Archivable {
  name: string;
  icon: string;
  color: string;
  isSystem: boolean; // p.ej. "Ajuste / Reconciliación": no editable
  includeInSpendReports: boolean; // false para sistema/ajuste
  sortOrder: number;
}
