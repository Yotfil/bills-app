import type { Timestamp } from 'firebase/firestore';

export interface UserSettings {
  currency: 'COP';
  locale: string; // 'es-CO'
  onboardingCompleted: boolean;
  // Tope mensual de "gasto hormiga" (§5.8): null si el usuario aún no lo puso. La app lo sugiere
  // a partir del promedio de los meses más bajos del usuario y avisa (sin regaño) al acercarse.
  hormigaMonthlyCap: number | null;
  schemaVersion: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
