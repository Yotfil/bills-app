// Resultado del recálculo total: cachés reconstruidas por id de entidad (CLAUDE.md §9.3).
export interface RecomputedBalances {
  accounts: Record<string, number>;
  cards: Record<string, number>;
  loans: Record<string, number>;
}
