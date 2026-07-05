// Resultado de calcular la revaluación de una cuenta en divisa (ver revaluation.ts).
export interface RevaluationResult {
  targetCop: number; // saldo COP que debería tener la cuenta: foreignAmount × tasa del día
  rateToCop: number; // tasa divisa→COP usada (para la nota del ajuste)
}
