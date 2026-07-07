import { useEffect, useState } from 'react';
import { getUsdRateTable } from '../../data/exchangeRate/exchangeRateService';
import type { ExchangeRateTable } from '../../domain/ExchangeRateTable';

// Lee la tabla de tasas base USD una vez al montar (la caché diaria evita pedir de más,
// §5.11). Espejo de useUsdToCopRate, para quien necesita convertir cualquier divisa.
export function useUsdRateTable(): { table: ExchangeRateTable | null; loading: boolean } {
  const [table, setTable] = useState<ExchangeRateTable | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getUsdRateTable()
      .then((t) => active && setTable(t))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return { table, loading };
}
