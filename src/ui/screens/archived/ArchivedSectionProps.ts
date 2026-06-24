import type { ReactNode } from 'react';

export interface ArchivedSectionProps {
  /** Título del grupo (Cuentas, Tarjetas, Créditos…). */
  title: string;
  /** Filas archivadas (`ArchivedItemRow`) de este grupo. */
  children: ReactNode;
}
