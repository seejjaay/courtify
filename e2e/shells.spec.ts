import { expect, test } from '@playwright/test';
import { signInAs } from './support/auth';
import { SEED } from './support/seed-ids';

for (const path of ['/owner', '/admin', '/me/bookings']) {
  test(`anon is sent to login from ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path)}`));
  });
}

test('players get a 404 from /admin', async ({ page }) => {
  await signInAs(page, 'player');
  expect((await page.goto('/admin'))?.status()).toBe(404);
});

test('staff see operate tools but not billing', async ({ page }) => {
  await signInAs(page, 'staff');
  await page.goto(`/owner/${SEED.venues.terracottaRallyClub}/today`);
  const nav = page.getByRole('navigation', { name: 'Venue', exact: true });
  await expect(nav.getByRole('link', { name: 'Check-in' })).toBeVisible();
  await expect(nav.getByRole('link', { name: /Billing/ })).toHaveCount(0);
  expect((await page.goto(`/owner/${SEED.venues.terracottaRallyClub}/billing`))?.status()).toBe(404);
});

test('owner switches between their venues', async ({ page }) => {
  await signInAs(page, 'owner');
  await page.goto('/owner');
  for (const name of ['Terracotta Rally Club', 'Kanto Baseline Courts', 'Patio Padel Tagaytay'])
    await expect(page.getByText(name)).toBeVisible();
});

test('a free venue shows Pro locks', async ({ page }) => {
  await signInAs(page, 'owner');
  await page.goto(`/owner/${SEED.venues.kantoBaselineCourts}/today`);
  await expect(page.getByRole('navigation', { name: 'Venue', exact: true }).getByRole('link', { name: /Analytics.*Pro/ })).toBeVisible();
});

test('admin sees queue badges', async ({ page }) => {
  await signInAs(page, 'admin');
  await page.goto('/admin');
  const nav = page.getByRole('navigation', { name: 'Admin' });
  await expect(nav.getByRole('link', { name: /Venue approvals.*1/ })).toBeVisible();
  await expect(nav.getByRole('link', { name: /Subscriptions.*1/ })).toBeVisible();
});

test('navigating keeps the shell mounted', async ({ page }) => {
  await signInAs(page, 'owner');
  await page.goto(`/owner/${SEED.venues.terracottaRallyClub}/today`);
  const shell = await page.locator('[data-shell="owner"]').elementHandle();
  await page.getByRole('navigation', { name: 'Venue', exact: true }).getByRole('link', { name: 'Calendar' }).click();
  await expect(page).toHaveURL(/\/calendar$/);
  expect(await shell!.evaluate((el) => el.isConnected)).toBe(true);
});

test('mobile tab bar puts Check-in in the centre', async ({ page, isMobile }) => {
  test.skip(!isMobile);
  await signInAs(page, 'staff');
  await page.goto(`/owner/${SEED.venues.terracottaRallyClub}/today`);
  const items = page.getByRole('navigation', { name: 'Venue tabs' }).getByRole('link');
  await expect(items.nth(2)).toHaveAccessibleName('Check-in');
});
