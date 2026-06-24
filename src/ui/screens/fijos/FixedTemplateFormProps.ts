import type { Account, Category, CreditCard, FixedObligationTemplate } from '../../../domain/types';

export interface FixedTemplateFormProps {
  open: boolean;
  template?: FixedObligationTemplate | null;
  accounts: Account[];
  cards: CreditCard[];
  categories: Category[];
  onClose: () => void;
}
