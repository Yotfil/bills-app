import { test, expect, type Page } from '@playwright/test';
import { copDigits, registerNewUser, signUpWithAccount } from './helpers';

// Flujos críticos de la app (CLAUDE.md §12.2) contra el Emulator Suite.

/** Clic en un destino de la barra inferior (acotado a la nav para no chocar con otros enlaces
 * que contengan el mismo texto, p.ej. el botón "‹ Volver a Más" o "Ver todo el registro"). */
function tab(page: Page, name: RegExp) {
  return page.getByRole('navigation').getByRole('link', { name });
}

/** Abre una sub-pantalla de la sección "Más" navegando por la UI (sin recargar la página). */
async function openMore(page: Page, label: string) {
  await tab(page, /Más/).click();
  // El nombre accesible del enlace incluye su hint ("Cuentas Saldos, reservado…"), así que
  // anclamos al inicio del texto del enlace en vez de exigir coincidencia exacta.
  await page.getByRole('link', { name: new RegExp(`^${label}`) }).click();
}

test('onboarding completo siembra cuentas, tarjetas y plantilla de fijos', async ({ page }) => {
  await registerNewUser(page);

  // Paso 1 — cuentas (el más importante).
  await page.getByRole('button', { name: 'Empecemos' }).click();
  await page.getByRole('button', { name: '+ Agregar cuenta' }).click();
  await page.getByPlaceholder('Nombre (p.ej. Bancolombia)').fill('Bancolombia');
  await page.getByPlaceholder('Saldo inicial (COP)').fill('2000000');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page.getByText('Bancolombia')).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();

  // Paso 2 — tarjetas.
  await page.getByRole('button', { name: '+ Agregar tarjeta' }).click();
  await page.getByPlaceholder('Nombre (p.ej. TC Davivienda)').fill('TC Test');
  await page.getByPlaceholder('Cupo total (COP)').fill('5000000');
  await page.getByPlaceholder('Deuda actual (COP)').fill('1000000');
  await page.getByRole('button', { name: 'Crear tarjeta' }).click();
  await expect(page.getByText('TC Test')).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();

  // Paso 3 — créditos (lo omitimos).
  await page.getByRole('button', { name: 'Continuar' }).click();

  // Paso 4 — plantilla de fijos sugerida (§10).
  await page.getByRole('button', { name: 'Cargar plantilla sugerida' }).click();
  await expect(page.getByText(/Tienes \d+ fijos en tu plantilla/)).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();

  // Paso 5 — entrar a la app.
  await page.getByRole('button', { name: 'Entrar a la app' }).click();
  await expect(page.getByText('Disponible real')).toBeVisible();

  // Verificación: los datos quedaron sembrados.
  await openMore(page, 'Cuentas');
  await expect(page.getByText('Bancolombia')).toBeVisible();
  await openMore(page, 'Tarjetas');
  await expect(page.getByText('TC Test')).toBeVisible();
  await openMore(page, 'Plantilla');
  await expect(page.getByText('Arriendo')).toBeVisible();
});

test('registrar un gasto se refleja en el saldo y el dashboard', async ({ page }) => {
  await signUpWithAccount(page, { name: 'Cuenta Test', balance: 1_000_000 });

  // Disponible real arranca en el saldo sembrado.
  await expect(page.getByText(copDigits(1_000_000))).toBeVisible();

  // Captura cero fricción: botón central → monto → categoría → medio → guardar.
  await page.getByRole('button', { name: 'Agregar movimiento' }).click();
  await page.getByPlaceholder('0').fill('50000');
  await page.getByRole('button', { name: /Comidas/ }).click();
  await page.getByLabel('Medio de pago').selectOption({ label: 'Cuenta Test' });
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();

  // El movimiento aparece en el registro.
  await expect(page).toHaveURL(/\/registro/);
  await expect(page.getByText('Comidas')).toBeVisible();

  // Y el disponible real bajó a 950.000 en el dashboard.
  await tab(page, /Inicio/).click();
  await expect(page.getByText(copDigits(950_000))).toBeVisible();
});

/** Crea una plantilla de fijo (gasto) y genera los fijos del mes. Deja la pantalla en Fijos. */
async function seedFixedAndGenerate(page: Page, name: string, amount: number, account: string) {
  await openMore(page, 'Plantilla');
  await page.getByRole('button', { name: '+ Nuevo gasto fijo' }).click();
  await page.getByPlaceholder('Concepto (p.ej. Arriendo)').fill(name);
  await page.getByPlaceholder('Monto mensual (COP)').fill(String(amount));
  await page.getByLabel('Categoría').selectOption({ label: 'Servicios' });
  await page.getByLabel('Medio por defecto').selectOption({ label: account });
  await page.getByRole('button', { name: 'Crear fijo' }).click();
  await expect(page.getByText(name)).toBeVisible();

  await tab(page, /Fijos/).click();
  // Con el rollover automático (§5.10) los fijos del mes suelen generarse solos al entrar; si por
  // timing aún apareciera el botón manual, se usa. Cualquiera de las dos vías deja el fijo visible.
  await page
    .getByRole('button', { name: /Generar \d+ fijos del mes/ })
    .click({ timeout: 3000 })
    .catch(() => {});
  await expect(page.getByText('Pendiente')).toBeVisible();
}

test('destinar un fijo baja el disponible real sin cambiar el saldo', async ({ page }) => {
  await signUpWithAccount(page, { name: 'Cuenta Test', balance: 1_000_000 });
  await seedFixedAndGenerate(page, 'Internet', 100_000, 'Cuenta Test');

  // Antes de destinar: disponible real = saldo.
  await expect(page.getByText(copDigits(1_000_000))).toBeVisible();

  // Destinar (pending → allocated): abre el modal para elegir de qué cuenta se reserva (§5.2) y se
  // confirma con la única cuenta sembrada. El botón de confirmar del modal se acota con role="dialog"
  // para no chocar con el "Destinar" de la fila de fondo.
  await page.getByRole('button', { name: 'Destinar' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Destinar' }).click();
  await expect(page.getByText('Destinado')).toBeVisible();

  // El disponible real bajó a 900.000 (reservado 100.000).
  await expect(page.getByText(copDigits(900_000))).toBeVisible();

  // Pero el SALDO de la cuenta no cambió: sigue en 1.000.000, con 100.000 reservado.
  await openMore(page, 'Cuentas');
  await expect(page.getByText(copDigits(1_000_000))).toBeVisible(); // saldo
  await expect(page.getByText(copDigits(100_000))).toBeVisible(); // reservado
});

test('pagar un fijo crea la transacción y baja el saldo', async ({ page }) => {
  await signUpWithAccount(page, { name: 'Cuenta Test', balance: 1_000_000 });
  await seedFixedAndGenerate(page, 'Internet', 100_000, 'Cuenta Test');

  // Pagar directo (pending → paid): abre la confirmación con monto prellenado editable.
  // `exact` para no chocar con el botón "Apagar <nombre>" (ojito de §8.3), que contiene "pagar".
  await page.getByRole('button', { name: 'Pagar', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar pago' }).click();
  // El fijo quedó pagado: aparece su acción de "Deshacer pago" (solo visible en pagados),
  // selector inequívoco frente al texto "Pagado" que también está en la barra de totales.
  await expect(page.getByRole('button', { name: 'Deshacer pago' })).toBeVisible();

  // El saldo bajó a 900.000 en el dashboard.
  await tab(page, /Inicio/).click();
  await expect(page.getByText(copDigits(900_000))).toBeVisible();

  // Y la transacción se creó automáticamente (aparece en el registro con el nombre del fijo).
  await tab(page, /Registro/).click();
  await expect(page.getByText('Internet')).toBeVisible();
});

test('reconciliar una cuenta crea el movimiento de ajuste', async ({ page }) => {
  await signUpWithAccount(page, { name: 'Cuenta Test', balance: 1_000_000 });

  await openMore(page, 'Cuentas');
  // Las acciones de la tarjeta viven en el menú ⋮ (kebab): abrir y elegir "Reconciliar".
  await page.getByRole('button', { name: 'Acciones de Cuenta Test' }).click();
  await page.getByRole('menuitem', { name: 'Reconciliar' }).click();
  await page.getByLabel('Saldo real de la cuenta (COP)').fill('1200000');
  // Vista previa del ajuste por el desfase (+200.000).
  await expect(page.getByText(/Se creará un ajuste/)).toBeVisible();
  // El menú ya se cerró; el único "Reconciliar" visible es el submit del modal.
  await page.getByRole('button', { name: 'Reconciliar' }).click();
  // El modal se cierra al terminar (su campo desaparece): evita que su overlay intercepte el
  // siguiente clic de navegación.
  await expect(page.getByLabel('Saldo real de la cuenta (COP)')).toBeHidden();

  // El saldo quedó en 1.200.000 (el ajuste lo subió por el desfase exacto). El monto aparece
  // en Saldo y en Disponible (no hay reservado), así que basta con la primera coincidencia.
  await expect(page.getByText(copDigits(1_200_000)).first()).toBeVisible();

  // Y se creó el movimiento de ajuste (aparece en el registro con su concepto de sistema).
  await tab(page, /Registro/).click();
  await expect(page.getByText('Ajuste por reconciliación')).toBeVisible();
});

test('el tope de un presupuesto se ajusta por mes sin afectar la base ni otros meses', async ({
  page,
}) => {
  await signUpWithAccount(page, { name: 'Cuenta Test', balance: 1_000_000 });

  // Crear un presupuesto (base 400.000) y marcarlo "Mostrar en Fijos" para que aparezca en el checklist.
  await openMore(page, 'Plantilla');
  await page.getByRole('tab', { name: /Presupuestos/ }).click();
  await page.getByRole('button', { name: '+ Nuevo presupuesto' }).click();
  await page.getByLabel('Categoría').selectOption({ label: 'Comidas' });
  await page.getByPlaceholder(/Tope base/).fill('400000');
  await page.getByRole('button', { name: 'Crear presupuesto' }).click();
  await page.getByLabel('Mostrar en Fijos (checklist)').click();

  // Vista mensual → tab Presupuestos: el presupuesto aparece con su base (400.000). Se acota a la
  // lista con texto EXACTO: el monto también sale en la barra de totales y en el progreso ("$0 de …").
  await tab(page, /Fijos/).click();
  await page.getByRole('tab', { name: /Presupuestos/ }).click();
  await expect(page.getByRole('list').getByText('$ 400.000', { exact: true })).toBeVisible();

  // Ajustar el tope SOLO de este mes a 900.000.
  await page.getByRole('button', { name: 'Editar tope' }).click();
  await page.getByPlaceholder(/Tope del mes/).fill('900000');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('list').getByText('$ 900.000', { exact: true })).toBeVisible();

  // Mes siguiente: vuelve a la base (400.000).
  await page.getByLabel('Mes siguiente').click();
  await expect(page.getByRole('list').getByText('$ 400.000', { exact: true })).toBeVisible();
});

test('un presupuesto marcado "Mostrar en Fijos" aparece en el checklist y se marca pagado', async ({
  page,
}) => {
  await signUpWithAccount(page, { name: 'Cuenta Test', balance: 1_000_000 });

  // Crear presupuesto Comidas (base 400.000) en la Plantilla → Presupuestos y marcarlo "Mostrar en Fijos".
  await openMore(page, 'Plantilla');
  await page.getByRole('tab', { name: /Presupuestos/ }).click();
  await page.getByRole('button', { name: '+ Nuevo presupuesto' }).click();
  await page.getByLabel('Categoría').selectOption({ label: 'Comidas' });
  await page.getByPlaceholder(/Tope base/).fill('400000');
  await page.getByRole('button', { name: 'Crear presupuesto' }).click();
  await page.getByLabel('Mostrar en Fijos (checklist)').click();

  // En la vista mensual → Presupuestos: aparece como ítem de checklist "En curso" con su tope.
  await tab(page, /Fijos/).click();
  await page.getByRole('tab', { name: /Presupuestos/ }).click();
  await expect(page.getByText('En curso')).toBeVisible();
  await expect(page.getByRole('list').getByText('$ 400.000', { exact: true })).toBeVisible();

  // "Ya estaba pagado (sin movimiento)" → pasa a pagado, con opción de Deshacer.
  await page.getByRole('button', { name: 'Ya estaba pagado (sin movimiento)' }).click();
  await expect(page.getByText('Pagado (sin movimiento)')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Deshacer' })).toBeVisible();
});
