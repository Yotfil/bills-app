import type {
  Account,
  Budget,
  Category,
  CreditCard,
  FixedObligationTemplate,
  Loan,
} from '../../../domain/types';

export interface FixedTemplateFormProps {
  open: boolean;
  template?: FixedObligationTemplate | null;
  accounts: Account[];
  cards: CreditCard[];
  loans: Loan[];
  categories: Category[];
  // Para ofrecer "consume de un presupuesto" solo si la categoría tiene un presupuesto marcado
  // "Mostrar en Fijos" (la bolsa, §5.9).
  budgets: Budget[];
  onClose: () => void;
}
