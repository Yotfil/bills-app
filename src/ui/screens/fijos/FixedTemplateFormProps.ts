import type {
  Account,
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
  onClose: () => void;
}
