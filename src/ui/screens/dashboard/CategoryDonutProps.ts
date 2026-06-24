import type { CategorySlice } from './CategorySlice';

export interface CategoryDonutProps {
  slices: CategorySlice[];
  total: number;
  onSelect: (categoryId: string) => void;
}
