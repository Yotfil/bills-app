// Correcciones aplicadas por el recálculo total (CLAUDE.md §9.3), por id de entidad.
// El valor es la diferencia (correcto − cacheado) que se escribió; mapa vacío = todo cuadraba.
export interface RecalculationCorrections {
  accounts: Record<string, number>;
  cards: Record<string, number>;
  loans: Record<string, number>;
}
