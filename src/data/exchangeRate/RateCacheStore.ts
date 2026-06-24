import type { CachedRate } from './CachedRate';

// Almacén de la tasa cacheada (lo implementa localStorage en producción; en tests, memoria).
export interface RateCacheStore {
  read(): CachedRate | null;
  write(rate: CachedRate): void;
}
