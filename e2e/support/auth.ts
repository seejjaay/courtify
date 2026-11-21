import type { Page } from '@playwright/test';
import { SEED } from './seed-ids';

/**
 * Signs in a seeded demo account through the login form. Stays on the current page when it's
 * already /login, so a `next` in the URL is kept.
 */
export async function signInAs(page: Page, role: keyof typeof SEED.emails): Promise<void> {
  if (new URL(page.url()).pathname !== '/login') await page.goto('/login');
  await page.getByLabel('Email').fill(SEED.emails[role]);
  await page.getByLabel('Password', { exact: true }).fill(SEED.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((url) => url.pathname !== '/login');
}
