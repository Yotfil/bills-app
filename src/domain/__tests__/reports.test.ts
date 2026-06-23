import { describe, it } from 'vitest';

// CATÁLOGO DE TESTS (CLAUDE.md §12.1) — Reportes de gasto, etiqueta hormiga y presupuestos.
// Regla de oro (§5.4): transfer, debt_payment y adjustment NUNCA aparecen en "¿en qué se
// me va el dinero?". Solo los gastos reales (expense).

describe('Reportes de gasto', () => {
  it.todo('excluyen transfer del total de gasto');
  it.todo('excluyen debt_payment del total de gasto');
  it.todo('excluyen adjustment del total de gasto');
  it.todo('incluyen solo expense, agrupado por categoría');
});

describe('Etiqueta hormiga (§5.8)', () => {
  it.todo('suma el total de gastos con tag "hormiga" cruzando todas las categorías');
  it.todo('un gasto sin el tag no entra en el total de hormiga');
});

describe('Presupuestos por categoría (§5.9)', () => {
  it.todo('consumo = Σ gastos de esa categoría en el mes');
  it.todo('restante = monthlyLimit − consumo');
  it.todo('avisa (suavemente) al acercarse o superar el tope');
  it.todo('solo cuentan los expense de la categoría (no transfer/debt_payment/adjustment)');
});
