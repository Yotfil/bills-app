import { lazy, Suspense, useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { useSessionStore } from '../../../store/sessionStore';
import { createCategory, updateCategory } from '../../../data/categoryRepository';
import type { EmojiStyle } from 'emoji-picker-react';
import type { CategoryFormProps } from './CategoryFormProps';

// Selector de emojis con buscador y categorías. Se carga BAJO DEMANDA (lazy) para no sumar su peso
// al bundle principal: solo se descarga cuando el usuario abre el selector de icono.
const EmojiPicker = lazy(() => import('emoji-picker-react'));

// Paleta de colores para elegir de un toque (misma estética que el set base, §6).
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

// Crear/editar una categoría (CLAUDE.md §6, §8.4): nombre, icono (emoji) y color.
export function CategoryForm({ open, category, nextSortOrder, onClose }: CategoryFormProps) {
  const uid = useSessionStore((s) => s.user?.uid);
  const isEdit = !!category;
  const [name, setName] = useState(category?.name ?? '');
  const [icon, setIcon] = useState(category?.icon ?? '🏷️');
  const [color, setColor] = useState(category?.color ?? COLOR_PALETTE[0]!);
  const [pickerOpen, setPickerOpen] = useState(false);
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

        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">Icono</span>
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            className="flex items-center justify-between rounded-xl border border-slate-300 px-4 py-3 text-left outline-none focus:border-slate-500"
          >
            <span className="text-xl">{icon || '🏷️'}</span>
            <span className="text-sm text-slate-500">
              {pickerOpen ? 'Cerrar' : 'Elegir icono…'}
            </span>
          </button>
          {pickerOpen && (
            <Suspense fallback={<p className="py-3 text-sm text-slate-400">Cargando iconos…</p>}>
              <EmojiPicker
                onEmojiClick={(e) => {
                  setIcon(e.emoji);
                  setPickerOpen(false);
                }}
                emojiStyle={'native' as EmojiStyle}
                width="100%"
                height={340}
                searchPlaceholder="Buscar icono…"
                previewConfig={{ showPreview: false }}
                skinTonesDisabled
                lazyLoadEmojis
              />
            </Suspense>
          )}
        </div>

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
