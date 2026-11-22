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

test('for-venues answers the owner questions', async ({ page }) => {
  await page.goto('/for-venues');
  await expect(page.getByRole('heading', { level: 1, name: 'For venues' })).toBeVisible();
  await expect(page.locator('summary')).toHaveCount(5);
  for (const q of ['Is listing free?', 'What happens if Pro lapses?', 'Do players pay through Courtify?', 'Can my staff use it?', 'How long does setup take?']) {
    await expect(page.locator('summary', { hasText: q })).toBeVisible();
  }
  await page.locator('summary', { hasText: 'What happens if Pro lapses?' }).click();
  await expect(page.getByText('existing bookings').first()).toBeVisible();
  await expect(page.getByRole('region', { name: 'Free to list. Pro when you want bookings.' })).toContainText('₱999');
  await expect(page.getByRole('link', { name: 'List your venue' }).first()).toHaveAttribute('href', '/owner/new');
});

// Review Focus 3: small Android phones.
test('fits a 320px phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await expect(hero(page).getByRole('heading', { name: 'Find a court tonight.' })).toBeInViewport();
  await expect(hero(page).getByRole('link', { name: 'List your venue' })).toBeInViewport();
});

// Review Focus 1: Messenger/FB in-app browsers and 3G, where scripts may never arrive.
test('landing works without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL: 'http://localhost:3107' });
  const page = await context.newPage();
  await page.goto('/');
  await expect(hero(page).getByRole('heading', { name: 'Find a court tonight.' })).toBeVisible();
  await expect(hero(page).getByRole('link', { name: 'List your venue' })).toBeVisible();

  const pro = page.getByRole('article', { name: 'Pro' });
  await expect(pro).toContainText('₱999');
  await expect(pro).toContainText('₱9,990');

  const panel = page.getByRole('tabpanel');
  await expect(panel.getByRole('img', { name: 'Pickleball court' })).toBeVisible();
  await expect(panel).toContainText('kitchen by the net');

  await hero(page).getByRole('combobox', { name: 'Sport' }).selectOption('pickleball');
  await hero(page).getByRole('textbox', { name: 'City' }).fill('Makati');
  await hero(page).getByRole('button', { name: 'Search courts' }).click();
  // A plain GET form can't drop empty fields (that needs JS), so an empty `date=` rides along. /courts must treat it as absent.
  await expect(page).toHaveURL(/\/courts\?sport=pickleball&city=Makati&date=$/);
  await context.close();
});

// Review Focus 2: reduced motion means the finished page, from the same markup.
test('reduced motion shows the finished page', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.waitForLoadState('load');
  // Scroll through so any scroll-driven scene would have started.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
  });
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  const opacities = await page.$$eval('[data-scene]', (els) => els.map((el) => getComputedStyle(el).opacity));
  expect(opacities.length).toBeGreaterThan(0);
  expect(opacities.every((o) => o === '1')).toBe(true);
  expect(errors).toEqual([]);
});

for (const path of ['/', '/for-venues', '/legal/terms', '/legal/privacy']) {
  test(`no console errors on ${path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(path);
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500); // let the idle-started motion boot and run
    expect(errors).toEqual([]);
  });
}
