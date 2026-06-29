// Barrel del modelo de dominio (CLAUDE.md §9.1). Cada interfaz vive en su propio archivo;
// los type aliases acompañan a su interfaz relacionada. Importar desde '../domain/types'.
export * from './BaseDoc';
export * from './Archivable';
export * from './EntityRef';
export * from './Account';
export * from './CreditCard';
export * from './Loan';
export * from './Category';
export * from './FixedObligationTemplate';
export * from './FixedObligationMonthly';
export * from './Budget';
export * from './BudgetBoost';
export * from './Transaction';
export * from './UserSettings';
export * from './hormigaTag';
