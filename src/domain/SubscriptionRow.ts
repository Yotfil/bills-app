import type { PriceChange } from './PriceChange';

// Una fila del módulo de suscripciones (§15): la vista derivada de un fijo de la categoría
// "Suscripciones". No es un documento persistido; se calcula a partir de la plantilla de fijos
// y del historial de movimientos.
export interface SubscriptionRow {
  templateId: string;
  name: string;
  monthlyAmount: number; // monto presupuestado del fijo (lo que se espera pagar al mes)
  cancelCandidate: boolean; // marcada por el usuario como "candidata a cancelar"
  lastChargeDateKey: string | null; // 'YYYY-MM-DD' del último cobro registrado, o null si no hay
  renewalDay: number | null; // día del mes en que suele cobrarse (derivado del último cobro)
  priceIncrease: PriceChange | null; // subida de precio detectada vs el cobro anterior, o null
}
