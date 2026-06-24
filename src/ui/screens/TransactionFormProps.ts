import type { Transaction } from '../../domain/types';

export interface TransactionFormProps {
  existing?: Transaction;
  onDone: () => void;
}
