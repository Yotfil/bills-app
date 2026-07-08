import type {
  Account,
  Category,
  CreditCard,
  Loan,
  Transaction,
} from '../../domain/types';

export interface TransactionListProps {
  /** Movimientos YA filtrados, en orden cronológico inverso (los agrupa por día). */
  transactions: Transaction[];
  /** Catálogo para resolver ícono y nombre de la categoría de cada movimiento. */
  categories: Category[];
  /** Cuentas/tarjetas/créditos para mostrar el nombre del medio (origen o destino). */
  accounts: Account[];
  cards: CreditCard[];
  loans: Loan[];
  /** Se invoca al tocar un movimiento (p. ej. para abrir su edición). */
  onSelect: (txn: Transaction) => void;
}
