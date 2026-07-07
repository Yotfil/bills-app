import type { CachedRateTable } from './CachedRateTable';
import type { RateCacheStore } from './RateCacheStore';

// Caché de la tabla de tasas en localStorage (CLAUDE.md §5.11): persiste la última tabla con
// su día de consulta, para no pedir a la API más de una vez al día y poder degradar sin
// conexión. (La clave vieja 'usd-cop-rate', de cuando solo se guardaba la tasa COP, queda
// huérfana e inocua.)
const KEY = 'usd-rates-table';

export const localStorageRateCache: RateCacheStore = {
  read(): CachedRateTable | null {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as CachedRateTable;
      // Defensa mínima contra un caché corrupto o de un esquema viejo.
      return parsed && typeof parsed.rates === 'object' ? parsed : null;
    } catch {
      return null;
    }
  },
  write(table: CachedRateTable): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(table));
    } catch {
      // sin localStorage (p.ej. modo privado): se ignora; se volverá a pedir.
    }
  },
};
