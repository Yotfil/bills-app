import type { Account, Category, CreditCard, Loan } from '../../domain/types';
import type { TransactionFilter } from '../../domain/transactionFilters';

export interface TransactionFiltersProps {
  /** Filtro actual (controlado por la pantalla). */
  filter: TransactionFilter;
  /** Se llama con el filtro completo ya modificado. */
  onChange: (filter: TransactionFilter) => void;
  /** Categorías para el desplegable de categoría. */
  categories: Category[];
  /** Cuentas para el desplegable de cuenta/medio (origen o destino). */
  accounts: Account[];
  /** Tarjetas para el desplegable de cuenta/medio. */
  cards: CreditCard[];
  /** Créditos para el desplegable de cuenta/medio. */
  loans: Loan[];
}
