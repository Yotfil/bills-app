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
  // Todas las plantillas: para saber si la categoría YA tiene un fijo respaldado (solo 1 bolsa por
  // categoría) y así decidir qué opción mostrar (respaldar vs consumir).
  templates: FixedObligationTemplate[];
  onClose: () => void;
}
