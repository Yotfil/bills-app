// Tope de gasto hormiga (CLAUDE.md §5.8). Lógica PURA: el tope es AUTOMÁTICO cada mes (promedio de
// los meses MÁS BAJOS del propio usuario, objetivo alcanzable "según cada uno"); el usuario puede
// editarlo para el mes en curso (override) y al mes siguiente vuelve a ser automático. El nivel de
// aviso reusa `budgetAlertLevel` (domain/budgetAlert.ts), igual que los topes de presupuesto.

/**
 * Tope sugerido = promedio de los `lowestN` meses con MENOR gasto hormiga, redondeado. Recibe el
 * gasto hormiga de meses CERRADOS (sin el mes en curso). Excluye los meses con $0 (son "sin datos /
 * nada marcado", no un mes real bajo; incluirlos haría el tope ~$0). Si quedan menos de `minMonths`
 * meses con datos, devuelve null (no hay base suficiente → la app aún no pide el tope).
 */
export function suggestHormigaCap(
  monthlyHormiga: number[],
  lowestN = 3,
  minMonths = 2,
): number | null {
  const withData = monthlyHormiga.filter((v) => v > 0);
  if (withData.length < minMonths) return null;
  const lowest = [...withData].sort((a, b) => a - b).slice(0, lowestN);
  const avg = lowest.reduce((sum, v) => sum + v, 0) / lowest.length;
  return Math.round(avg);
}

/**
 * Tope EFECTIVO de un mes (§5.8): el override manual de ESE mes si existe; si no, el automático
 * (`autoCap`). Cada mes sin override usa el automático, así varios meses pueden tener su propio
 * override sin pisarse. Devuelve null si no hay override del mes ni base automática (sin historia).
 */
export function resolveHormigaCap(
  overrides: Record<string, number> | undefined,
  month: string,
  autoCap: number | null,
): number | null {
  return overrides?.[month] ?? autoCap;
}
