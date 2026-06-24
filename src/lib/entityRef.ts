// Codificación de un EntityRef como string para usarlo en <select> y viceversa.
import type { EntityRef, LedgerEntityKind } from '../domain/types';

export const refToValue = (ref: EntityRef | null): string => (ref ? `${ref.kind}:${ref.id}` : '');

export function valueToRef(value: string): EntityRef | null {
  if (!value) return null;
  const [kind, id] = value.split(':');
  return { kind: kind as LedgerEntityKind, id: id ?? '' };
}
