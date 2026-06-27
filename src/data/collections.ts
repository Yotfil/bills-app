// Referencias a las colecciones de Firestore, tipadas y con converter (CLAUDE.md §9.2).
// Todo cuelga del usuario: users/{uid}/<colección>. Un único lugar define las rutas, así
// la lógica nunca arma strings de path a mano.
import { collection, type CollectionReference, type Firestore } from 'firebase/firestore';
import { db } from './firebase';
import { docConverter, type Persisted } from './converters';
import type {
  Account,
  BaseDoc,
  Budget,
  Category,
  CreditCard,
  FixedObligationMonthly,
  FixedObligationTemplate,
  Loan,
  Transaction,
} from '../domain/types';

/** Versión de esquema con la que nacen los documentos nuevos (CLAUDE.md §13.3). */
export const CURRENT_SCHEMA_VERSION = 1;

// Nombres de las subcolecciones (§9.2). Centralizados para evitar typos.
export const COLLECTION = {
  accounts: 'accounts',
  cards: 'cards',
  loans: 'loans',
  categories: 'categories',
  fixedTemplates: 'fixedTemplates',
  fixedMonthly: 'fixedMonthly',
  budgets: 'budgets',
  transactions: 'transactions',
} as const;

/** Lanza si Firestore no está configurado, para fallar con un mensaje claro. */
function requireDb(): Firestore {
  if (!db) {
    throw new Error('Firestore no está configurado. Define las claves en .env.local.');
  }
  return db;
}

function userCollection<T extends BaseDoc>(
  uid: string,
  name: string,
): CollectionReference<T, Persisted<T>> {
  return collection(requireDb(), 'users', uid, name).withConverter(docConverter<T>());
}

export const accountsCol = (uid: string) => userCollection<Account>(uid, COLLECTION.accounts);
export const cardsCol = (uid: string) => userCollection<CreditCard>(uid, COLLECTION.cards);
export const loansCol = (uid: string) => userCollection<Loan>(uid, COLLECTION.loans);
export const categoriesCol = (uid: string) => userCollection<Category>(uid, COLLECTION.categories);
export const fixedTemplatesCol = (uid: string) =>
  userCollection<FixedObligationTemplate>(uid, COLLECTION.fixedTemplates);
export const fixedMonthlyCol = (uid: string) =>
  userCollection<FixedObligationMonthly>(uid, COLLECTION.fixedMonthly);
export const budgetsCol = (uid: string) => userCollection<Budget>(uid, COLLECTION.budgets);
export const transactionsCol = (uid: string) =>
  userCollection<Transaction>(uid, COLLECTION.transactions);
