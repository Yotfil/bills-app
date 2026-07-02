import { useState } from 'react';
import { describeError } from '../../lib/firebaseError';

/**
 * Unifica el patrón busy/error de las acciones asíncronas de la UI (guardar, pagar, borrar…):
 * `run` ejecuta la acción, marca `busy` mientras corre (para deshabilitar el submit) y, si falla,
 * traduce el error a un mensaje mostrable en `error` — nunca se traga el fallo en silencio.
 * Devuelve `true` si la acción terminó bien (el caller decide si cierra el modal / limpia el form).
 * `setError` queda expuesto para errores de validación propios del form (mismo canal de mensaje).
 */
export function useAsyncAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (err) {
      setError(describeError(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, setError, run };
}
