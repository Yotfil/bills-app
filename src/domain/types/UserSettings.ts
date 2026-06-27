import type { Timestamp } from 'firebase/firestore';

/**
 * Override MANUAL del tope de gasto hormiga para un mes concreto (§5.8). El tope es automático cada
 * mes (promedio de los meses más bajos); si el usuario lo edita, se guarda este override SOLO para
 * ese mes. Al cambiar de mes, el override queda "viejo" y el tope vuelve a ser automático.
 */
export type HormigaCapOverride = { month: string; value: number };

export interface UserSettings {
  currency: 'COP';
  locale: string; // 'es-CO'
  onboardingCompleted: boolean;
  // Override manual del tope de gasto hormiga del mes en curso (§5.8); null = usar el automático.
  hormigaCapOverride: HormigaCapOverride | null;
  schemaVersion: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
