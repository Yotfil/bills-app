// Firestore guarda Timestamp; la UI lo convierte a Date/ISO al mostrar (CLAUDE.md §9.1).
import type { Timestamp } from 'firebase/firestore';

export interface BaseDoc {
  id: string; // = doc.id (NO se guarda dentro del documento)
  createdAt: Timestamp;
  updatedAt: Timestamp;
  schemaVersion: number; // para migraciones futuras
}
