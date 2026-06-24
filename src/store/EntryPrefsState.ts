import type { EntityRef, TransactionType } from '../domain/types';

// Preferencias de captura para reducir fricción (CLAUDE.md §5.4): recuerda el último medio
// de pago y tipo usados para prellenarlos la próxima vez.
export interface EntryPrefsState {
  lastSource: EntityRef | null;
  lastType: TransactionType;
  remember: (type: TransactionType, source: EntityRef | null) => void;
}
