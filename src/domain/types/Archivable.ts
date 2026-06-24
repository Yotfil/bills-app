import type { Timestamp } from 'firebase/firestore';

// Borrar = archivar si hay histórico (CLAUDE.md §8).
export interface Archivable {
  archived: boolean;
  archivedAt: Timestamp | null;
}
