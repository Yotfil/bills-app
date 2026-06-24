import type { CachedRate } from './CachedRate';
import type { RateCacheStore } from './RateCacheStore';

// Caché de la tasa en localStorage (CLAUDE.md §5.11): persiste la última tasa con su día de
// consulta, para no pedir a la API más de una vez al día y poder degradar sin conexión.
const KEY = 'usd-cop-rate';

export const localStorageRateCache: RateCacheStore = {
  read(): CachedRate | null {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as CachedRate) : null;
    } catch {
      return null;
    }
  },
  write(rate: CachedRate): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(rate));
    } catch {
      // sin localStorage (p.ej. modo privado): se ignora; se volverá a pedir.
    }
  },
};
