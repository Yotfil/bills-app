import type { ReactNode } from 'react';

export interface ButtonProps {
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  children: ReactNode;
}
