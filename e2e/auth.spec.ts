import { expect, test, type Page } from '@playwright/test';
import { signInAs } from './support/auth';
import { latestAuthLink } from './support/mail';

// Fresh accounts use @e2e.test so they never count as seeded @courtify.test accounts.
const freshEmail = () => `e2e-${crypto.randomUUID().slice(0, 8)}@e2e.test`;

async function signUpAndConfirm(page: Page, email: string): Promise<void> {
  await page.goto('/signup');
  await page.getByLabel('Full name').fill('Edd Tester');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('a-strong-pass');
  await page.getByLabel(/I agree/).check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Check your email to confirm your account.')).toBeVisible();
  await page.goto(await latestAuthLink(email));
  await expect(page).toHaveURL(/\/me\/bookings$/);
}

test('protected page sends anon to login, then back after sign-in', async ({ page }) => {
  await page.goto('/me/bookings');
  await expect(page).toHaveURL(/\/login\?next=%2Fme%2Fbookings/);
  await page.getByLabel('Email').fill('player@courtify.test');
  await page.getByLabel('Password', { exact: true }).fill('courtify-demo');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/me\/bookings$/);
  await expect(page.getByText('Signed in')).toBeVisible();
});

test('wrong password shows an inline error', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('player@courtify.test');
  await page.getByLabel('Password', { exact: true }).fill('nope-nope');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Email or password is incorrect.')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test('signup needs consent, then the email link signs you in', async ({ page }) => {
  const email = freshEmail();
  await page.goto('/signup');
  await page.getByLabel('Full name').fill('Edd Tester');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('a-strong-pass');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Please accept the Terms and Privacy Policy to continue.')).toBeVisible();
  await page.getByLabel(/I agree/).check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Check your email to confirm your account.')).toBeVisible();
  await page.goto(await latestAuthLink(email));
  await expect(page).toHaveURL(/\/me\/bookings$/);
});

test('password reset by email link', async ({ page }) => {
  const email = freshEmail();
  await signUpAndConfirm(page, email);
  await page.context().clearCookies(); // signed out

  await page.goto('/forgot-password');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByText('If that email has an account, a reset link is on its way.')).toBeVisible();
  await page.goto(await latestAuthLink(email));
  await expect(page).toHaveURL(/\/reset-password/);
  await page.getByLabel('New password', { exact: true }).fill('another-strong-pass');
  await page.getByLabel('Confirm new password', { exact: true }).fill('another-strong-pass');
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(page.getByText('Password updated')).toBeVisible();
});

test('each password field has its own show/hide', async ({ page }) => {
  await page.goto('/signup');
  const toggle = page.getByRole('button', { name: 'Show password' });
  await toggle.click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
});

test('demo quick-logins are absent from production builds', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByText('Demo accounts')).toHaveCount(0);
});

test('open redirects are blocked', async ({ page }) => {
  await page.goto('/login?next=//evil.example');
  await signInAs(page, 'player');
  await expect(page).toHaveURL('http://localhost:3107/');
});
