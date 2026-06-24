import type { ReconcileTarget } from './ReconcileTarget';

export interface ReconcileModalProps {
  open: boolean;
  target: ReconcileTarget | null;
  onClose: () => void;
}
