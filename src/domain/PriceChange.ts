// Subida de precio de una suscripción: se compara el último cobro contra el anterior
// (mes a mes). Solo se reporta cuando AUMENTÓ (delta > 0); las bajadas no generan alerta.
export interface PriceChange {
  previous: number; // monto del cobro anterior
  current: number; // monto del último cobro
  delta: number; // current - previous (siempre > 0)
}
