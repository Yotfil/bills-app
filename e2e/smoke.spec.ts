import { test, expect } from '@playwright/test';

// Humo: la app arranca y renderiza. Los flujos críticos (login, onboarding, registrar
// gasto, fijos, reconciliar — CLAUDE.md §12.2) se agregan en sus pasos del plan.
test('la app carga y muestra el título', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Mis Luks')).toBeVisible();
});
