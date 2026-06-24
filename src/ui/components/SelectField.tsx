import type { SelectFieldProps } from './SelectFieldProps';

// Campo de selección con etiqueta, reutilizable en los formularios.
export function SelectField({ label, value, onChange, options, placeholder }: SelectFieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
