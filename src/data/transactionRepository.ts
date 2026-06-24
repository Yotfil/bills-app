// Lectura de transacciones (CLAUDE.md §8.2). La ESCRITURA va siempre por transactionService
// (efectos atómicos sobre saldos, §9.3); aquí solo se suscribe a la lista en tiempo real.
import { onSnapshot, orderBy, query } from 'firebase/firestore';
import { transactionsCol } from './collections';
import type { Transaction } from '../domain/types';

/**
 * Se suscribe a las transacciones del usuario en orden cronológico inverso (lo más reciente
 * primero), como las muestra el Registro (§8.2). Devuelve la función para desuscribirse.
 */
export function subscribeTransactions(
  uid: string,
  onChange: (items: Transaction[]) => void,
): () => void {
  const q = query(transactionsCol(uid), orderBy('date', 'desc'));
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => d.data())));
}
