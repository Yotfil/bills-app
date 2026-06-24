import type { Timestamp } from 'firebase/firestore';

export interface UserSettings {
  currency: 'COP';
  locale: string; // 'es-CO'
  onboardingCompleted: boolean;
  schemaVersion: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
