import { useUsdToCopRate } from '../../hooks/useUsdToCopRate';
import { formatCop } from '../../../lib/currency';

// Tasa USD→COP, referencia discreta en el dashboard (CLAUDE.md §5.11, §8.1). Solo informativa:
// no convierte movimientos. Muestra la fecha del dato y degrada con gracia sin conexión.
const SOURCE_LABEL = {
  'exchangerate-api': 'ExchangeRate-API',
  'currency-api': 'currency-api',
} as const;

/** 'YYYY-MM-DD' → 'DD/MM'. */
function shortDate(iso: string): string {
  const [, month, day] = iso.split('-');
  return day && month ? `${day}/${month}` : iso;
}

export function ExchangeRateNote() {
  const { rate, loading } = useUsdToCopRate();

  if (loading) {
    return <p className="text-center text-xs text-slate-300">Tasa USD→COP…</p>;
  }
  if (!rate) {
    return <p className="text-center text-xs text-slate-300">Tasa USD→COP no disponible</p>;
  }

  return (
    <p className="text-center text-xs text-slate-400">
      1 USD = <span className="font-medium text-slate-500">{formatCop(rate.rate)}</span>
      <span className="text-slate-300">
        {' '}
        · tasa del {shortDate(rate.date)} · {SOURCE_LABEL[rate.source]}
      </span>
    </p>
  );
}
