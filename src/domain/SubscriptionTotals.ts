// Totales del módulo de suscripciones (§15): cuánto suman al mes y, anualizado, al año.
// Como todas las suscripciones son mensuales (decisión del dueño), anual = mensual × 12.
export interface SubscriptionTotals {
  monthly: number;
  annual: number;
}
