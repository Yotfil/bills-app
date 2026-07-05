import type { CachedRateTable } from './CachedRateTable';

// Almacén de la tabla cacheada (lo implementa localStorage en producción; en tests, memoria).
export interface RateCacheStore {
  read(): CachedRateTable | null;
  write(table: CachedRateTable): void;
}
