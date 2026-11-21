import { expect, test, type Page } from '@playwright/test';

const hero = (page: Page) => page.getByRole('region', { name: 'Book courts. Run courts.' });

test('both doors are visible without scrolling', async ({ page }) => {
  await page.goto('/');
  await expect(hero(page).getByRole('heading', { name: 'Find a court tonight.' })).toBeInViewport();
  await expect(hero(page).getByRole('link', { name: 'List your venue' })).toBeInViewport();
});

test('search hands off to /courts', async ({ page }) => {
  await page.goto('/');
  await hero(page).getByRole('combobox', { name: 'Sport' }).selectOption('pickleball');
  await hero(page).getByRole('textbox', { name: 'City' }).fill('Makati');
  await hero(page).getByRole('button', { name: 'Search courts' }).click();
  await expect(page).toHaveURL(/\/courts\?sport=pickleball&city=Makati&date=\d{4}-\d{2}-\d{2}$/);
});

test('List your venue reaches the owner flow', async ({ page }) => {
  await page.goto('/');
  await hero(page).getByRole('link', { name: 'List your venue' }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fowner%2Fnew$/);
});

// Review Focus 3: small Android phones.
test('fits a 320px phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await expect(hero(page).getByRole('heading', { name: 'Find a court tonight.' })).toBeInViewport();
  await expect(hero(page).getByRole('link', { name: 'List your venue' })).toBeInViewport();
});
