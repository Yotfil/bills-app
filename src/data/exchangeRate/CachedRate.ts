import type { ExchangeRate } from '../../domain/ExchangeRate';

// Tasa cacheada localmente, con el día en que se consultó la API (para no pedir más de una
// vez al día, CLAUDE.md §5.11).
export interface CachedRate extends ExchangeRate {
  fetchedAt: string; // 'YYYY-MM-DD' del día en que se consultó
}
