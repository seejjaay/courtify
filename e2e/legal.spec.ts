import { expect, test } from '@playwright/test';

const DOCS = {
  '/legal/terms': [
    'What Courtify is',
    'Your account',
    'Booking and cancelling',
    'For venues',
    'Pro billing',
    'Acceptable use',
    'Suspension',
    'Liability',
    'Governing law',
    'Contact',
  ],
  '/legal/privacy': [
    'Who we are',
    'What we collect',
    'Why we use it',
    'Who can see it',
    "Where it's stored",
    'How long we keep it',
    'Your rights',
    'Keeping it safe',
    'Cookies',
    'Changes',
    'Contact',
  ],
} as const;

for (const [path, headings] of Object.entries(DOCS)) {
  test(`legal draft is complete: ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByText('Draft — not legal advice')).toBeVisible();
    await expect(page.getByText(/Last updated/)).toBeVisible();
    for (const heading of headings) {
      await expect(page.getByRole('heading', { level: 2, name: heading, exact: true })).toBeVisible();
    }
    // The table of contents links to each section.
    await expect(page.getByRole('navigation', { name: 'On this page' }).getByRole('link')).toHaveCount(headings.length);
  });
}

test('privacy names the operator placeholders and the RA 10173 rights', async ({ page }) => {
  await page.goto('/legal/privacy');
  await expect(page.getByText('[Operator name]').first()).toBeVisible();
  await expect(page.getByText('[contact email]').first()).toBeVisible();
  await expect(page.getByText('National Privacy Commission').first()).toBeVisible();
});

test('the landing has an og:image that serves a PNG', async ({ page, request }) => {
  await page.goto('/');
  const content = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(content).toBeTruthy();
  const res = await request.get(new URL(content!).pathname);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('image/png');
});
