import { test, expect, type APIRequestContext } from '@playwright/test';
import { uniqueEmail } from './helpers';

// Aislamiento de datos (CLAUDE.md §3, §12.2): un usuario NO puede leer datos de otro. Lo
// probamos ejerciendo directamente las reglas de seguridad cargadas en el emulador de
// Firestore con dos usuarios distintos, sin pasar por la UI (que nunca pide datos ajenos).

const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key';
const FIRESTORE = 'http://127.0.0.1:8080/v1/projects/demo-bills/databases/(default)/documents';

/** Crea un usuario en el Auth emulator y devuelve su token e id. */
async function signUp(request: APIRequestContext) {
  const res = await request.post(AUTH, {
    data: { email: uniqueEmail(), password: 'test1234', returnSecureToken: true },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return { token: body.idToken as string, uid: body.localId as string };
}

test('un usuario no puede leer los datos de otro', async ({ request }) => {
  const alice = await signUp(request);
  const bob = await signUp(request);

  const aliceDoc = `${FIRESTORE}/users/${alice.uid}/accounts/secreta`;

  // Alice escribe una cuenta en su propio árbol → permitido.
  const write = await request.patch(aliceDoc, {
    headers: { Authorization: `Bearer ${alice.token}` },
    data: { fields: { name: { stringValue: 'Cuenta secreta de Alice' } } },
  });
  expect(write.ok()).toBeTruthy();

  // Alice lee lo suyo → permitido.
  const ownRead = await request.get(aliceDoc, {
    headers: { Authorization: `Bearer ${alice.token}` },
  });
  expect(ownRead.ok()).toBeTruthy();

  // Bob intenta leer el documento de Alice → denegado por las reglas (403).
  const crossRead = await request.get(aliceDoc, {
    headers: { Authorization: `Bearer ${bob.token}` },
  });
  expect(crossRead.status()).toBe(403);

  // Bob tampoco puede escribir en el árbol de Alice → denegado (403).
  const crossWrite = await request.patch(aliceDoc, {
    headers: { Authorization: `Bearer ${bob.token}` },
    data: { fields: { name: { stringValue: 'intruso' } } },
  });
  expect(crossWrite.status()).toBe(403);
});
