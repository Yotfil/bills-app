// Early access (allowlist por correo). El candado REAL vive en las reglas de Firestore
// (firestore.rules: isAllowed): sin estar en /allowlist el usuario no puede leer ni escribir
// nada. Aquí solo CONSULTAMOS si el correo está aprobado para mostrar la UI adecuada (app vs
// pantalla "sin acceso"). El dueño administra la lista desde la consola de Firebase.
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * ¿El correo está en la allowlist? Lee /allowlist/{email}. El doc puede estar vacío: basta
 * con que exista. La comparación es sensible a mayúsculas (debe coincidir EXACTO con lo que
 * Firebase reporta como correo del usuario), así que conviene agregar los correos en minúscula.
 */
export async function isEmailAllowed(email: string): Promise<boolean> {
  if (!db) return false; // Firebase no configurado: sin datos, no hay acceso.
  const snapshot = await getDoc(doc(db, 'allowlist', email));
  return snapshot.exists();
}
