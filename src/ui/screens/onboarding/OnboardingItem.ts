// Un ítem ya agregado durante el onboarding (cuenta, tarjeta o crédito).
export interface OnboardingItem {
  id: string;
  primary: string; // nombre
  secondary: string; // saldo/deuda formateado
}
