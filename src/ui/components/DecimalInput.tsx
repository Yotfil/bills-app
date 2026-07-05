import { normalizeDecimalText } from '../../lib/currency';
import type { DecimalInputProps } from './DecimalInputProps';

// Campo de monto en DIVISA (USD, EUR…): a diferencia de MoneyInput (COP entero, §3), acepta
// hasta 2 decimales. Se muestra con coma decimal (es-CO) y el estado del formulario guarda el
// texto crudo con punto ("1234.56"). Sin separador de miles en vivo: en es-CO el punto de miles
// chocaría con el punto decimal del teclado, y es un campo de baja frecuencia.
export function DecimalInput({ value, onChange, ...rest }: DecimalInputProps) {
  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      value={value.replace('.', ',')}
      onChange={(e) => onChange(normalizeDecimalText(e.target.value))}
    />
  );
}
