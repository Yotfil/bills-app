import { useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { useSessionStore } from '../../../store/sessionStore';
import { createCategory, updateCategory } from '../../../data/categoryRepository';
import type { CategoryFormProps } from './CategoryFormProps';

// Paleta de colores e iconos sugeridos (emoji) para elegir de un toque. El usuario también puede
// escribir cualquier emoji en el campo. Misma estética que el set base (§6).
const COLOR_PALETTE = [
  '#f97316',
  '#22c55e',
  '#3b82f6',
  '#a855f7',
  '#ef4444',
  '#14b8a6',
  '#ec4899',
  '#6366f1',
  '#0ea5e9',
  '#eab308',
  '#8b5cf6',
  '#64748b',
];
const EMOJI_QUICK = ['🏷️', '🍔', '🛒', '🚗', '🎭', '🩺', '🏠', '👨‍👩‍👧', '📚', '💡', '📺', '🎁'];

// Crear/editar una categoría (CLAUDE.md §6, §8.4): nombre, icono (emoji) y color.
export function CategoryForm({ open, category, nextSortOrder, onClose }: CategoryFormProps) {
  const uid = useSessionStore((s) => s.user?.uid);
  const isEdit = !!category;
  const [name, setName] = useState(category?.name ?? '');
  const [icon, setIcon] = useState(category?.icon ?? '🏷️');
  const [color, setColor] = useState(category?.color ?? COLOR_PALETTE[0]!);
  const [busy, setBusy] = useState(false);
  const formKey = category?.id ?? 'new';

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!uid || !name.trim()) return;
    setBusy(true);
    try {
      if (isEdit && category) {
        await updateCategory(uid, category.id, { name: name.trim(), icon, color });
      } else {
        await createCategory(uid, { name, icon, color, sortOrder: nextSortOrder });
      }
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title={isEdit ? 'Editar categoría' : 'Nueva categoría'} onClose={onClose}>
      <form key={formKey} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
            style={{ backgroundColor: `${color}20` }}
          >
            {icon || '🏷️'}
          </span>
          <input
            autoFocus
            placeholder="Nombre de la categoría"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
          />
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">Icono (emoji)</span>
          <input
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-3 text-lg outline-none focus:border-slate-500"
          />
          <div className="mt-1 flex flex-wrap gap-1.5">
            {EMOJI_QUICK.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setIcon(e)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg ${
                  icon === e ? 'bg-slate-200' : 'bg-slate-50 hover:bg-slate-100'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">Color</span>
          <div className="flex flex-wrap gap-2">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                style={{ backgroundColor: c }}
                className={`h-8 w-8 rounded-full ${
                  color === c ? 'ring-2 ring-slate-800 ring-offset-2' : ''
                }`}
              />
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="rounded-xl bg-slate-800 py-3 font-medium text-white disabled:opacity-50"
        >
          {isEdit ? 'Guardar' : 'Crear categoría'}
        </button>
      </form>
    </Modal>
  );
}
