import type { ActionMenuItem } from './ActionMenuItem';

export interface ActionMenuProps {
  /** Acciones a mostrar en el menú, en orden. */
  items: ActionMenuItem[];
  /** Etiqueta accesible del botón ⋮ (ej. "Acciones de Cajitas Nu"). */
  ariaLabel?: string;
}
