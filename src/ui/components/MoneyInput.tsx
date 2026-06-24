import type { InputHTMLAttributes } from 'react';
import { digitsOnly, formatThousands } from '../../lib/currency';

// Campo de monto en COP (CLAUDE.md §3): muestra el valor con separador de miles (1.000) mientras
// se escribe, y al pegar acepta el número con o sin formato (extrae solo los dígitos). El estado
// del formulario sigue siendo el ENTERO crudo en string ("1000"), así que la lógica de guardado
// no cambia. Usa type="text" porque <input type="number"> no admite los puntos de miles.
//
// `value` = dígitos crudos (''=vacío). `onChange` recibe los dígitos crudos ya normalizados.
interface MoneyInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'inputMode'> {
  value: string;
  onChange: (digits: string) => void;
}

export function MoneyInput({ value, onChange, ...rest }: MoneyInputProps) {
  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      value={formatThousands(value)}
      onChange={(e) => onChange(digitsOnly(e.target.value))}
    />
  );
}
