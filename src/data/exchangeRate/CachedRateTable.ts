import type { ExchangeRateTable } from '../../domain/ExchangeRateTable';

// Tabla de tasas cacheada localmente, con el día en que se consultó la API (para no pedir
// más de una vez al día, CLAUDE.md §5.11).
export interface CachedRateTable extends ExchangeRateTable {
  fetchedAt: string; // 'YYYY-MM-DD' del día en que se consultó
}
