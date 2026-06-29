import type { Timestamp } from 'firebase/firestore';

export interface UserSettings {
  currency: 'COP';
  locale: string; // 'es-CO'
  onboardingCompleted: boolean;
  // Override MANUAL del tope de gasto hormiga POR MES ('YYYY-MM' → monto, §5.8). El tope es automático
  // cada mes (promedio de los meses más bajos); si el usuario lo edita un mes, se guarda aquí solo para
  // ese mes. Ausente para un mes = ese mes usa el tope automático. Permite ajustar varios meses sin
  // pisar los demás (vista mensual en /fijos).
  hormigaCapOverrides?: Record<string, number>;
  schemaVersion: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
