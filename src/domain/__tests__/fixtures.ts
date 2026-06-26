// Constructores de objetos de dominio para los tests. Rellenan los campos requeridos con
// valores por defecto razonables; cada test sobreescribe lo que le importa.
import type { Timestamp } from 'firebase/firestore';
import type {
  Account,
  CreditCard,
  EntityRef,
  FixedObligationMonthly,
  Loan,
  TransactionDraft,
} from '../types';

// Las funciones bajo prueba no leen fechas, así que un stub basta (no se persiste aquí).
export const STUB_TS = {} as Timestamp;

export const accountRef = (id: string): EntityRef => ({ kind: 'account', id });
export const cardRef = (id: string): EntityRef => ({ kind: 'card', id });
export const loanRef = (id: string): EntityRef => ({ kind: 'loan', id });

export function makeTxn(partial: Partial<TransactionDraft> = {}): TransactionDraft {
  return {
    date: STUB_TS,
    concept: 'Test',
    type: 'expense',
    amount: 1000,
    categoryId: 'cat-comidas',
    source: accountRef('acc-1'),
    destination: null,
    adjustmentDirection: null,
    tags: [],
    note: null,
    fixedMonthlyId: null,
    ...partial,
  };
}

export function makeAccount(partial: Partial<Account> = {}): Account {
  return {
    id: 'acc-1',
    createdAt: STUB_TS,
    updatedAt: STUB_TS,
    schemaVersion: 1,
    archived: false,
    archivedAt: null,
    name: 'Ahorros',
    type: 'savings',
    initialBalance: 0,
    cachedBalance: 0,
    savingsBucket: false,
    foreignCurrency: null,
    foreignAmount: null,
    color: '#000',
    icon: 'bank',
    sortOrder: 0,
    ...partial,
  };
}

export function makeCard(partial: Partial<CreditCard> = {}): CreditCard {
  return {
    id: 'card-1',
    createdAt: STUB_TS,
    updatedAt: STUB_TS,
    schemaVersion: 1,
    archived: false,
    archivedAt: null,
    name: 'TC',
    creditLimit: 1_000_000,
    initialDebt: 0,
    cachedDebt: 0,
    color: '#000',
    icon: 'card',
    sortOrder: 0,
    ...partial,
  };
}

export function makeLoan(partial: Partial<Loan> = {}): Loan {
  return {
    id: 'loan-1',
    createdAt: STUB_TS,
    updatedAt: STUB_TS,
    schemaVersion: 1,
    archived: false,
    archivedAt: null,
    name: 'Crédito',
    originalAmount: 10_000_000,
    seedBalance: 10_000_000,
    cachedBalance: 10_000_000,
    monthlyPayment: 500_000,
    annualRate: null,
    startDate: null,
    ...partial,
  };
}

export function makeFixed(partial: Partial<FixedObligationMonthly> = {}): FixedObligationMonthly {
  return {
    id: 'fx-1',
    createdAt: STUB_TS,
    updatedAt: STUB_TS,
    schemaVersion: 1,
    month: '2026-06',
    templateId: 'tpl-1',
    name: 'Luz',
    budgetedAmount: 230_000,
    categoryId: 'cat-servicios',
    payKind: 'expense',
    debtTargetId: null,
    paymentMethod: accountRef('acc-1'),
    status: 'pending',
    paidAmount: null,
    transactionId: null,
    allocatedAt: null,
    paidAt: null,
    ...partial,
  };
}
