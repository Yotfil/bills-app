import type { ButtonProps } from './ButtonProps';

// Botón de ancho completo con dos variantes (primaria oscura / secundaria con borde).
export function Button({ onClick, variant = 'primary', disabled, children }: ButtonProps) {
  const variantClass =
    variant === 'primary'
      ? 'bg-slate-800 text-white'
      : 'border border-slate-300 bg-white text-slate-700';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl py-3 font-medium disabled:opacity-50 ${variantClass}`}
    >
      {children}
    </button>
  );
}
