export interface EyeToggleProps {
  /** `true` si el valor está visible (muestra el ojo abierto); `false` lo oculta (ojo tachado). */
  shown: boolean;
  /** Alterna entre mostrar/ocultar. */
  onToggle: () => void;
  /** Para el aria-label: "Ocultar/Mostrar {label}". */
  label?: string;
  /** Tamaño del ícono (clases Tailwind). Por defecto h-4 w-4. */
  iconClassName?: string;
}
