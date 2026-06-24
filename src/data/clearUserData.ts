// Borra TODOS los datos transaccionales/entidades del usuario para sembrar desde cero (uso
// temporal). Conserva las categorías base y el documento de ajustes (users/{uid}).
import {
  deleteDoc,
  getDocs,
  type CollectionReference,
  type DocumentData,
} from 'firebase/firestore';
import {
  accountsCol,
  budgetsCol,
  cardsCol,
  fixedMonthlyCol,
  fixedTemplatesCol,
  loansCol,
  transactionsCol,
} from './collections';

async function clearCollection(col: CollectionReference<unknown, DocumentData>): Promise<number> {
  const snap = await getDocs(col);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  return snap.size;
}

/** Borra cuentas, tarjetas, créditos, fijos (plantilla y mensuales), presupuestos y movimientos. */
export async function clearUserData(uid: string): Promise<number> {
  const cols = [
    accountsCol(uid),
    cardsCol(uid),
    loansCol(uid),
    fixedTemplatesCol(uid),
    fixedMonthlyCol(uid),
    budgetsCol(uid),
    transactionsCol(uid),
  ];
  const counts = await Promise.all(cols.map((col) => clearCollection(col)));
  return counts.reduce((a, b) => a + b, 0);
}
