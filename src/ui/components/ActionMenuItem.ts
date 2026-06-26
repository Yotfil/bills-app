import type { LucideIcon } from 'lucide-react';

// Una acción dentro del menú de 3 puntos (⋮) de una tarjeta (§8.4).
export interface ActionMenuItem {
  /** Texto de la acción (Editar, Reconciliar, Archivar, Eliminar…). */
  label: string;
  /** Icono (componente de lucide-react) que la acompaña. */
  icon: LucideIcon;
  /** Se ejecuta al elegir la acción (el menú se cierra solo). */
  onSelect: () => void;
  /** `true` para acciones destructivas (Eliminar): se pinta en rojo. */
  danger?: boolean;
}
