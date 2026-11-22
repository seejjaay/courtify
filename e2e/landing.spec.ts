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

test('how it works lists the three steps', async ({ page }) => {
  await page.goto('/');
  const steps = page.getByRole('region', { name: 'From search to serve.' }).getByRole('listitem');
  await expect(steps).toHaveCount(3);
  await expect(steps.nth(0)).toContainText('Search');
  await expect(steps.nth(1)).toContainText('Pick a slot');
  await expect(steps.nth(2)).toContainText('Play');
});

test('owners section is labelled as a product preview and links onward', async ({ page }) => {
  await page.goto('/');
  const owners = page.getByRole('region', { name: 'Run your day from one screen.' });
  await expect(owners.getByText('Product preview')).toBeVisible();
  await expect(owners.getByRole('link', { name: 'List your venue' })).toHaveAttribute('href', '/owner/new');
  await expect(owners.getByRole('link', { name: 'See how it works for venues' })).toHaveAttribute('href', '/for-venues');
});

test('pricing shows the platform settings', async ({ page }) => {
  await page.goto('/');
  const pricing = page.getByRole('region', { name: 'Free to list. Pro when you want bookings.' });
  const pro = pricing.getByRole('article', { name: 'Pro' });
  await expect(pro).toContainText('₱999');
  await expect(pro).toContainText('₱9,990');
  await expect(pro).toContainText('30-day');
  await expect(pricing.getByRole('article', { name: 'Free listing' })).toBeVisible();
});

test('closing call to action offers both doors', async ({ page }) => {
  await page.goto('/');
  const closing = page.getByRole('region', { name: 'Your court. Your time. Your game.' });
  await expect(closing.getByRole('link', { name: 'Find a court' })).toHaveAttribute('href', '/courts');
  await expect(closing.getByRole('link', { name: 'List your venue' })).toHaveAttribute('href', '/owner/new');
});

// Review Focus 3: small Android phones.
test('fits a 320px phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await expect(hero(page).getByRole('heading', { name: 'Find a court tonight.' })).toBeInViewport();
  await expect(hero(page).getByRole('link', { name: 'List your venue' })).toBeInViewport();
});
