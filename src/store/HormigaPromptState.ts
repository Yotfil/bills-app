// Recuerda si el usuario descartó el aviso "ponle tope a tu gasto hormiga" (§5.8), para no insistir.
// Estado de cliente puro (no toca reglas de negocio). El tope se puede poner luego desde Reportes.
export interface HormigaPromptState {
  dismissed: boolean;
  dismiss: () => void;
}
