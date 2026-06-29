import type { FixedFilter } from '../../../domain/fixedFilters';

export interface FixedFiltersProps {
  filter: FixedFilter;
  onChange: (filter: FixedFilter) => void;
  // Opciones presentes entre los gastos del mes (sin la opción "todos", que es el placeholder).
  categoryOptions: { value: string; label: string }[];
  methodOptions: { value: string; label: string }[];
  expanded: boolean; // controlado desde FijosScreen (toggle junto a "Ordenar")
}
