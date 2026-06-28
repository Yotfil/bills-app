import type { SubscriptionRow } from '../../../domain/subscriptions';

export interface SubscriptionItemProps {
  row: SubscriptionRow;
  daysUntilRenewal: number | null; // días hasta renovar si está dentro de la ventana, o null
  onToggleCancel: (next: boolean) => void; // marcar/desmarcar "candidata a cancelar"
  onOpen: () => void; // abrir el registro filtrado por la categoría
}
