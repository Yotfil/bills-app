import type { AdjustmentDirection } from '../../domain/types';

// Describe lo que se va a reconciliar (cuenta, tarjeta o crédito) de forma genérica, para que el
// ReconcileModal sirva a las tres pantallas (§5.7). Cada pantalla arma este objeto y resuelve el
// pago concreto en `reconcile` (que llama a reconcileAccount/reconcileCard/reconcileLoan).
export interface ReconcileTarget {
  id: string; // para remontar el formulario al cambiar de entidad
  name: string; // nombre, para el título
  registeredValue: number; // valor registrado actual (saldo o deuda)
  registeredLabel: string; // "Saldo registrado" | "Deuda registrada"
  inputLabel: string; // "Saldo real de la cuenta (COP)" | "Deuda real de la tarjeta (COP)" …
  goodDirection: AdjustmentDirection; // qué dirección se muestra en verde (subir saldo vs bajar deuda)
  // Crea el ajuste por el desfase; devuelve true si lo creó (false si no había desfase).
  reconcile: (realValue: number, note: string) => Promise<boolean>;

  // --- Cuenta en moneda extranjera (opcional): reconciliar EN LA DIVISA (decisión 2026-07-05).
  // Si los tres campos vienen, el modal pide el saldo real en la divisa y el COP es solo el
  // reflejo de la conversión. Sin tasa disponible (offline sin caché) se omiten → modo COP.
  foreignCurrency?: string | null; // p.ej. 'USD'
  foreignAmount?: number | null; // monto registrado en la divisa (referencia en el modal)
  copPerUnit?: number | null; // tasa divisa→COP del día
  reconcileForeign?: (realForeign: number, note: string) => Promise<boolean>;
}
