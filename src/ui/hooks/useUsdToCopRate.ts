import { useEffect, useState } from 'react';
import { getUsdToCopRate } from '../../data/exchangeRate/exchangeRateService';
import type { ExchangeRate } from '../../domain/ExchangeRate';

// Lee la tasa USD→COP una vez al montar (la caché diaria evita pedir de más, §5.11).
export function useUsdToCopRate(): { rate: ExchangeRate | null; loading: boolean } {
  const [rate, setRate] = useState<ExchangeRate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getUsdToCopRate()
      .then((r) => active && setRate(r))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return { rate, loading };
}
