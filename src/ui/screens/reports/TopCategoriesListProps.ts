export interface TopCategoryRow {
  categoryId: string;
  name: string;
  color: string;
  total: number;
}

export interface TopCategoriesListProps {
  rows: TopCategoryRow[]; // ya ordenadas por gasto descendente
  onSelect: (categoryId: string) => void; // tocar una lleva al Registro filtrado
}
