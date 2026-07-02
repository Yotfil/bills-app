import { test, expect, type APIRequestContext } from '@playwright/test';
import { uniqueEmail } from './helpers';

// Aislamiento de datos (CLAUDE.md §3, §12.2): un usuario NO puede leer datos de otro. Lo
// probamos ejerciendo directamente las reglas de seguridad cargadas en el emulador de
// Firestore con dos usuarios distintos, sin pasar por la UI (que nunca pide datos ajenos).

const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key';
const FIRESTORE = 'http://127.0.0.1:8080/v1/projects/demo-bills/databases/(default)/documents';

/**
 * Crea un usuario en el Auth emulator. Por defecto lo APRUEBA en la allowlist (early access)
 * vía la REST API (Bearer owner salta las reglas), para que pueda tocar sus propios datos; con
 * `allow: false` queda fuera de la lista (para probar el candado de acceso).
 */
async function signUp(request: APIRequestContext, { allow = true } = {}) {
  const email = uniqueEmail();
  const res = await request.post(AUTH, {
    data: { email, password: 'test1234', returnSecureToken: true },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  if (allow) {
    const approve = await request.patch(`${FIRESTORE}/allowlist/${encodeURIComponent(email)}`, {
      headers: { Authorization: 'Bearer owner' },
      data: { fields: {} },
    });
    expect(approve.ok()).toBeTruthy();
  }
  return { token: body.idToken as string, uid: body.localId as string, email };
}

test('un usuario no puede leer los datos de otro', async ({ request }) => {
  // Ambos aprobados: así el 403 cruzado se debe a la PROPIEDAD (aislamiento), no a la allowlist.
  const alice = await signUp(request);
  const bob = await signUp(request);

  const aliceDoc = `${FIRESTORE}/users/${alice.uid}/accounts/secreta`;

  // Alice escribe una cuenta en su propio árbol → permitido. El doc debe cumplir la estructura
  // mínima que validan las reglas (name string + saldos numéricos), como los que crea la app.
  const write = await request.patch(aliceDoc, {
    headers: { Authorization: `Bearer ${alice.token}` },
    data: {
      fields: {
        name: { stringValue: 'Cuenta secreta de Alice' },
        cachedBalance: { integerValue: '1000' },
        initialBalance: { integerValue: '1000' },
      },
    },
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

test('un usuario fuera de la allowlist no puede tocar ni sus propios datos', async ({
  request,
}) => {
  // Early access: sin estar en la allowlist, las reglas niegan TODO dato propio (el candado no
  // vive en la UI). La cuenta en Auth existe, pero es inservible hasta que el dueño apruebe.
  const carol = await signUp(request, { allow: false });
  const carolDoc = `${FIRESTORE}/users/${carol.uid}/accounts/secreta`;

  const write = await request.patch(carolDoc, {
    headers: { Authorization: `Bearer ${carol.token}` },
    data: { fields: { name: { stringValue: 'no debería poder' } } },
  });
  expect(write.status()).toBe(403);

  const read = await request.get(carolDoc, {
    headers: { Authorization: `Bearer ${carol.token}` },
  });
  expect(read.status()).toBe(403);
});
