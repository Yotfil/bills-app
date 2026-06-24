// Repositorio de créditos grandes (CLAUDE.md §5.6, §8.4). El saldo (cachedBalance) es una
// caché que baja con cada abono (debt_payment); la fuente de verdad son los movimientos.
import { loansCol } from './collections';
import {
  archive,
  create,
  hardDelete,
  subscribeAll,
  unarchive,
  update,
  type CreateInput,
  type UpdateInput,
} from './crud';
import type { NewLoan } from './NewLoan';
import type { Loan } from '../domain/types';

export type { NewLoan } from './NewLoan';

/** Construye el documento a crear (función pura, testeable). */
export function buildLoanCreateInput(input: NewLoan): CreateInput<Loan> {
  return {
    name: input.name.trim(),
    originalAmount: input.originalAmount,
    seedBalance: input.currentBalance, // semilla persistida para el recálculo total (§9.3)
    cachedBalance: input.currentBalance, // el saldo arranca igual a la semilla
    monthlyPayment: input.monthlyPayment,
    annualRate: input.annualRate ?? null,
    startDate: null,
    archived: false,
    archivedAt: null,
  };
}

export const subscribeLoans = (uid: string, onChange: (items: Loan[]) => void) =>
  subscribeAll(loansCol(uid), onChange);

export const createLoan = (uid: string, input: NewLoan) =>
  create(loansCol(uid), buildLoanCreateInput(input));

// El saldo no se edita a mano: baja con abonos. Aquí solo metadatos y parámetros del crédito.
export type EditableLoanFields = Pick<
  UpdateInput<Loan>,
  'name' | 'originalAmount' | 'monthlyPayment' | 'annualRate'
>;

export const updateLoan = (uid: string, id: string, data: EditableLoanFields) =>
  update(loansCol(uid), id, data);

export const archiveLoan = (uid: string, id: string) => archive(loansCol(uid), id);

export const unarchiveLoan = (uid: string, id: string) => unarchive(loansCol(uid), id);

// Borrado físico: solo si el crédito NO tiene abonos (movimientos) asociados (§8.4).
export const deleteLoan = (uid: string, id: string) => hardDelete(loansCol(uid), id);
