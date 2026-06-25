import type { ReactNode } from 'react';

export interface OnboardingStepProps {
  title: string;
  subtitle: ReactNode; // admite texto o JSX (p.ej. para resaltar una parte en bold)
  children: ReactNode;
}
