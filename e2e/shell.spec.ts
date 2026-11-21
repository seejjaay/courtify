import { expect, test } from '@playwright/test';

test('skip link is the first tab stop and focuses main', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main#main')).toBeFocused();
});

test('unknown URL shows the 404 inside the site shell', async ({ page }) => {
  const res = await page.goto('/definitely-not-a-page');
  expect(res?.status()).toBe(404);
  await expect(page).toHaveTitle('Page not found · Courtify');
  await expect(page.getByRole('heading', { level: 1, name: 'That page is out of bounds.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Find courts' })).toBeVisible();
});

// Only /legal/terms and /legal/privacy exist; any other doc must be a real 404.
test('unknown legal doc is a real 404', async ({ page }) => {
  const res = await page.goto('/legal/cookies');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1, name: 'That page is out of bounds.' })).toBeVisible();
});

test('home has a title and exactly one h1', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Courtify/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
});
