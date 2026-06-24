import type { ArchivedSectionProps } from './ArchivedSectionProps';

// Grupo de la pantalla Archivados: un título por sección (Cuentas, Ahorros, Tarjetas…) con
// sus filas. La pantalla solo lo monta cuando el grupo tiene elementos archivados.
export function ArchivedSection({ title, children }: ArchivedSectionProps) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-xs font-semibold text-slate-400 uppercase">{title}</h2>
      <ul className="overflow-hidden rounded-xl border border-slate-200 bg-white">{children}</ul>
    </section>
  );
}
