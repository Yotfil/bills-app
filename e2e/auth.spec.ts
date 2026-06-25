import { test, expect } from '@playwright/test';
import { registerNewUser, uniqueEmail } from './helpers';

// Login (CLAUDE.md §12.2). Contra el Auth emulator: registramos un usuario nuevo y luego
// iniciamos sesión con sus credenciales. El flujo de Google usa el widget del emulador.

const PASSWORD = 'test1234';

test('registro e inicio de sesión con correo/contraseña', async ({ page }) => {
  const email = uniqueEmail();

  // 1) Registro: crea la cuenta y aterriza en el onboarding.
  await registerNewUser(page, email);

  // 2) Cerrar sesión desde el onboarding y volver al login.
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page.getByText('Mis Luks')).toBeVisible();

  // 3) Iniciar sesión con las mismas credenciales (modo login por defecto).
  await page.getByPlaceholder('Correo').fill(email);
  await page.getByPlaceholder('Contraseña').fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();

  // Como el onboarding ya quedó marcado (no), vuelve al onboarding del mismo usuario.
  await expect(page.getByRole('button', { name: 'Empecemos' })).toBeVisible();
});

test('credenciales incorrectas muestran un error claro', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('Correo').fill(uniqueEmail());
  await page.getByPlaceholder('Contraseña').fill('claveinvalida');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
});

test('inicio de sesión con Google (widget del emulador)', async ({ page, context }) => {
  await page.goto('/');

  // El botón abre el popup del emulador de Auth, que simula el selector de cuentas de Google.
  const popupPromise = context.waitForEvent('page');
  await page.getByRole('button', { name: 'Continuar con Google' }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState();

  // Widget del emulador: agregar una cuenta nueva y autogenerar sus datos.
  await popup.getByRole('button', { name: 'Add new account' }).click();
  await popup.getByRole('button', { name: 'Auto-generate user information' }).click();
  await popup.getByRole('button', { name: /Sign in with/ }).click();

  // De vuelta en la app: usuario nuevo → onboarding.
  await expect(page.getByRole('button', { name: 'Empecemos' })).toBeVisible();
});
