import type { Timestamp } from 'firebase/firestore';
import type { EntityRef } from './types';

// Opciones para construir el movimiento de ajuste de una reconciliación (CLAUDE.md §5.7).
export interface BuildAdjustmentOptions {
  source: EntityRef; // entidad a reconciliar (cuenta, tarjeta o crédito): origen del ajuste
  adjustmentCategoryId: string; // id de la categoría de sistema "Ajuste / Reconciliación"
  date: Timestamp;
  note?: string | null;
}
