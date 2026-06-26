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
  budgets: Budget[]; // para ofrecer "respaldar con presupuesto" solo si la categoría tiene uno (§5.9)
  onClose: () => void;
}
