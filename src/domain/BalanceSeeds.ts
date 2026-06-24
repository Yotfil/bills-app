// Semillas de arranque para el recálculo total (valores del onboarding, CLAUDE.md §9.3).
export interface BalanceSeeds {
  accounts: Record<string, number>; // initialBalance por cuenta
  cards: Record<string, number>; // deuda inicial por tarjeta
  loans: Record<string, number>; // saldo inicial por crédito
}
