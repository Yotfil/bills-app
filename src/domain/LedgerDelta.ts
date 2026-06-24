// Cambios a aplicar a las cachés de saldo, por id de entidad (CLAUDE.md §9.3).
// Positivo = sube esa caché.
export interface LedgerDelta {
  accounts: Record<string, number>; // delta a cuenta.cachedBalance
  cards: Record<string, number>; // delta a tarjeta.cachedDebt
  loans: Record<string, number>; // delta a crédito.cachedBalance
}
