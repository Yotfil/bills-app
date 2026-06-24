import { expect, type Page } from '@playwright/test';

// Helpers de e2e (CLAUDE.md §12.2). Corren contra el Emulator Suite: cada test crea un
// usuario nuevo con correo único, así que su árbol `users/{uid}` queda aislado del resto
// y los tests pueden correr en paralelo sin pisarse.

/** Correo único por test para no chocar con otros usuarios del emulador. */
export function uniqueEmail(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `e2e-${Date.now()}-${rand}@test.com`;
}

const PASSWORD = 'test1234';

/**
 * Registra un usuario nuevo por correo/contraseña y espera a aterrizar en el onboarding
 * (todo usuario nuevo arranca con `onboardingCompleted = false`).
 */
export async function registerNewUser(page: Page, email = uniqueEmail()): Promise<string> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Regístrate' }).click();
  await page.getByPlaceholder('Correo').fill(email);
  await page.getByPlaceholder('Contraseña').fill(PASSWORD);
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  // Aterriza en el onboarding.
  await expect(page.getByRole('button', { name: 'Empecemos' })).toBeVisible();
  return email;
}

/**
 * Atajo para los tests que necesitan la app ya usable: registra un usuario, siembra UNA
 * cuenta con su saldo en el onboarding y entra al dashboard (saltando el resto de pasos).
 */
export async function signUpWithAccount(
  page: Page,
  account: { name: string; balance: number },
): Promise<void> {
  await registerNewUser(page);
  await page.getByRole('button', { name: 'Empecemos' }).click();
  await page.getByRole('button', { name: '+ Agregar cuenta' }).click();
  await page.getByPlaceholder('Nombre (p.ej. Bancolombia)').fill(account.name);
  await page.getByPlaceholder('Saldo inicial (COP)').fill(String(account.balance));
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  // La cuenta aparece en la lista del onboarding.
  await expect(page.getByText(account.name)).toBeVisible();
  // Salir del onboarding entra a la app y marca onboardingCompleted.
  await page.getByRole('button', { name: 'Saltar por ahora' }).click();
  await expect(page.getByText('Disponible real')).toBeVisible();
}

/** Regex para encontrar un monto COP por su agrupación de miles (evita el NBSP del símbolo). */
export function copDigits(amount: number): RegExp {
  const grouped = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(amount);
  // Escapa los puntos para usarlo como patrón literal.
  return new RegExp(grouped.replace(/\./g, '\\.'));
}
