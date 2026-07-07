import type { InputHTMLAttributes } from 'react';

// Props del DecimalInput. `value` es el texto decimal crudo normalizado con punto
// ("1234.56"; '' = vacío); `onChange` recibe ese mismo formato ya normalizado.
export interface DecimalInputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'value' | 'onChange' | 'type' | 'inputMode'
  > {
  value: string;
  onChange: (raw: string) => void;
}
