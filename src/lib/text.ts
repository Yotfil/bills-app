// Búsqueda por texto reutilizable (Registro §8.2, Fijos y Obligaciones fijas). La meta es
// que escribir "luz" encuentre "Luz", "LUZ" y "luz" sin que el usuario se preocupe por
// tildes ni mayúsculas. Vive en `lib/` (puro, sin React) para compartirse entre pantallas.

/** Pasa a minúsculas y quita tildes/diacríticos para comparar sin fricción. */
export function normalizeText(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * `true` si TODAS las palabras de `query` aparecen en alguno de los `fields`.
 * Tokeniza por espacios, así "merc yul" encuentra "Mercado Yulieth". Una consulta vacía
 * (sin palabras) siempre coincide: no filtrar es mostrar todo.
 */
export function matchesQuery(query: string, ...fields: (string | null | undefined)[]): boolean {
  const tokens = normalizeText(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = normalizeText(fields.filter(Boolean).join(' '));
  return tokens.every((token) => haystack.includes(token));
}
