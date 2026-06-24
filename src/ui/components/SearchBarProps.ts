export interface SearchBarProps {
  /** Texto actual de la búsqueda (controlado). */
  value: string;
  /** Se llama con el nuevo texto en cada pulsación. */
  onChange: (value: string) => void;
  /** Texto guía dentro del campo (ej. "Buscar movimiento…"). */
  placeholder?: string;
}
