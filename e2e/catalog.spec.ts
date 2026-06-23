import { test } from '@playwright/test';

// CATÁLOGO E2E (CLAUDE.md §12.2) — Flujos críticos. Escritos como `test.fixme`: aparecen
// en el reporte como pendientes y se implementan en sus pasos del plan (§14). No fallan.

test.describe('Flujos críticos (catálogo)', () => {
  test.fixme('login con Google', async () => {
    // Paso 3: iniciar sesión con Google y aterrizar en la app.
  });

  test.fixme('login con correo/contraseña', async () => {
    // Paso 3: iniciar sesión con email + password.
  });

  test.fixme('onboarding completo siembra cuentas, tarjetas, créditos y plantilla de fijos', async () => {
    // Paso 14: recorrer el onboarding y verificar los datos sembrados.
  });

  test.fixme('registrar un gasto en ≤ 2 toques y verlo reflejado en saldo y dashboard', async () => {
    // Paso 7/8: capturar gasto con fricción mínima y ver el saldo y el dashboard actualizados.
  });

  test.fixme('marcar un fijo como destinado baja el disponible real sin cambiar el saldo', async () => {
    // Paso 9: estado allocated → reservado sube, cachedBalance igual.
  });

  test.fixme('marcar un fijo como pagado crea la transacción y actualiza el saldo', async () => {
    // Paso 9: estado paid → transacción autogenerada + saldo abajo.
  });

  test.fixme('reconciliar una cuenta crea el movimiento de ajuste', async () => {
    // Paso 10: reconciliación genera un adjustment por el desfase.
  });

  test.fixme('aislamiento de datos: un usuario no puede leer datos de otro', async () => {
    // Reglas de Firestore (§3, §12.2): verificar que users/{uid} aísla por usuario.
  });
});
