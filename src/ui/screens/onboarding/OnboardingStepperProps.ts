export interface OnboardingStepperProps {
  /** Etiquetas de los pasos, en orden (se numeran 1..N al mostrar). */
  steps: string[];
  /** Paso actual (1-based). */
  current: number;
  /**
   * `true` si se permite la navegación libre (el paso 1 obligatorio ya está cumplido). Mientras
   * sea `false`, los pasos se ven pero NO son clickeables.
   */
  enabled: boolean;
  /** Navega al paso elegido (1-based). Solo se dispara cuando `enabled`. */
  onSelect: (step: number) => void;
}
