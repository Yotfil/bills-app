import { FirebaseError } from 'firebase/app';

/**
 * Traduce un error (de Firebase o cualquiera) a un mensaje corto y accionable para el usuario.
 * Centraliza los códigos comunes de Firestore para que todas las pantallas hablen igual; antes
 * cada form inventaba su mensaje (o peor: tragaba el error sin avisar).
 */
export function describeError(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'permission-denied':
        return 'No tienes permiso para hacer esto. Si acabas de entrar, revisa tu acceso.';
      case 'unavailable':
        return 'Sin conexión con el servidor. Revisa tu red e intenta de nuevo.';
      case 'unauthenticated':
        return 'Tu sesión expiró. Vuelve a iniciar sesión.';
      case 'not-found':
        return 'Ese dato ya no existe (pudo borrarse desde otro dispositivo).';
      default:
        return `No se pudo completar la operación (${error.code}).`;
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Algo salió mal. Intenta de nuevo.';
}
