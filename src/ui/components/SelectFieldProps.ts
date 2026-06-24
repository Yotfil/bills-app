import type { SelectFieldOption } from './SelectFieldOption';

export interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectFieldOption[];
  placeholder: string;
}
