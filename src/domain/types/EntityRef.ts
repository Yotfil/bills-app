// Referencia a una entidad del libro (cuenta, tarjeta o crédito). El type alias relacionado
// vive aquí junto a su interfaz.
export type LedgerEntityKind = 'account' | 'card' | 'loan';

export interface EntityRef {
  kind: LedgerEntityKind;
  id: string;
}
