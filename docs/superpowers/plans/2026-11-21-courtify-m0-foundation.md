# Courtify M0: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A running Next 16 app with Courtify's design tokens, shared primitives, role shells and working auth, on top of a local Supabase database that already holds:
- the full schema and RLS policies
- the booking engine
- the venue-lifecycle and billing RPCs
- search, storage policies and scheduled jobs
- realistic seed data

**Architecture:**
- SQL owns every rule that must never break: overlaps, pricing, the state machine and access control.
- The app is a thin typed client over RPCs and RLS-guarded tables.
- Next App Router runs with Cache Components.
- `src/proxy.ts` refreshes the Supabase session cookies.
- Layouts and server actions re-check access on the server.

**Tech Stack:** Next 16.4 · React 19.3 · TypeScript strict · Tailwind 4.3 + shadcn 4 · supabase-js 2.119 + @supabase/ssr 0.12 · Supabase CLI 3.2 (devDependency) · Postgres extensions postgis, btree_gist, pg_trgm, pg_cron, pgtap · Vitest 5 + Testing Library · Playwright 1.65 · zod 4 · sharp

**Spec:** `docs/superpowers/specs/2026-11-21-courtify-design.md`

## Global Constraints
- **Tooling:** Node 24 and **npm**. Run the Supabase CLI as `npx supabase …` (it's a devDependency).
- **Next config:** App Router, `src/` directory, `@/*` alias, TypeScript `strict`, `cacheComponents: true`, `typedRoutes: true`. Session refresh lives in `src/proxy.ts`.
- **Palette tokens** (`--color-*` in `src/app/globals.css` `@theme`):

  | Token | Hex |
  |---|---|
  | clay | `#D1873A` |
  | sand | `#D8A878` |
  | stucco | `#ECE9E5` |
  | greige | `#DDD6D2` |
  | taupe | `#BFAE9C` |
  | chalk | `#F8F6F2` |
  | ink | `#2A1D14` |
  | ink-soft | `#6A5848` |
  | clay-ink | `#94501A` |
  | success | `#4F6B2E` |
  | warning | `#8A5A00` |
  | danger | `#A3321F` |

  Light theme only.
- **Contrast:** text/background pairs must be at least 4.5:1. Text on clay is always ink; chalk on clay is 2.7:1 and isn't used at any size.
- **Fonts:** Fugaz One (weight 400, display only, never below 20px) as `--font-fugaz`, and Work Sans (variable) as `--font-work-sans`, both via `next/font/google`.
- **Money:** integer centavos, in `*_centavos` columns and as `number` in TS.
- **Time:** venue timezone defaults to `Asia/Manila`. A booking's time is a half-open `tstzrange` `[)`.
- **Booking code:** 6 characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789`, displayed as `XXX-XXX`.
- **Roles:** per venue, `owner` > `manager` > `staff` (SQL enum `member_role`, TS `VenueRole`). Platform admin comes **only** from `platform_admins`. Roles are never read from user metadata.
- **RLS:** enabled on every table, deny by default. Helper functions are `security definer set search_path = ''`.
- **Writes through RPCs:** booking, billing and lifecycle state changes only happen through RPCs. `anon` and `authenticated` have no INSERT, UPDATE or DELETE on `bookings`, `booking_payments`, `booking_events`, `subscription_payments` or `audit_log`.
- **RPC errors:** failures `raise exception '<key>'` (SQLSTATE P0001) with exactly one of these keys:
  `not_authenticated, forbidden, not_found, invalid_state, venue_not_bookable, court_inactive, misaligned, outside_hours, too_soon, too_far, bad_duration, hold_limit, rate_limited, slot_taken, phone_required, hold_expired, bad_proof_path, reference_required, cancel_cutoff, check_in_window, reason_required, venue_incomplete, rate_overlap, last_owner`
- **Defaults:**

  | Setting | Value |
  |---|---|
  | Pro monthly | `99900` (₱999) |
  | Pro yearly | `999000` (₱9,990) |
  | Trial | `30` days |
  | Grace | `7` days |
  | Hold | `30` min |
  | Active holds per player | max `2` |
  | Bookings created per player | max `10` per rolling hour |
- **UI:** skeletons appear after `250` ms. Toasts sit `top-center`. A mutation that ends in a redirect toasts through the flash cookie. Every password field has its own show/hide.
- **Demo accounts** (local seed only), all with password `courtify-demo`: `admin@`, `owner@`, `manager@`, `staff@`, `player@courtify.test`. Quick-login UI exists only when `NODE_ENV === 'development'`.
- **E2E:** runs a production build on port `3107` with `reuseExistingServer: false`, against the local Supabase stack. Global setup checks that the stack is healthy first.
- **pgTAP tests:**
  - Each test builds its own fixtures and scopes every count to fixture IDs, so it passes with or without seed data.
  - No test depends on the wall-clock hour: use future dates computed in Manila time, or 24-hour fixture venues.
- **Commits:** CJ approves them. Each task ends with a proposed commit message.

## Review Focus
1. **Manila day boundary.** A venue's Friday hours run until 02:00, and a booking starts Saturday at 00:00. It belongs to Friday's session: `get_availability(v, fri)` includes it and `get_availability(v, sat)` doesn't. → Task 9
2. **Double-tap booking.** When the same player calls `create_booking` twice with the identical court and range, they get the same booking back, not `slot_taken`. → Task 9
3. **Proof after the hold expired.** `submit_booking_payment` raises `hold_expired`, and another player can then book that slot. → Task 10
4. **Two managers review one proof.** The second review raises `invalid_state` and no duplicate event is logged. → Task 10
5. **A player deletes their account.** Their bookings stay with `player_id = null`, and venue staff can still see them. → Task 7

## Plan-level calls (beyond the spec; flag if wrong)
- **Paid period after a trial:** `verify_subscription_payment` starts the paid period at `greatest(now, pro_until, trial_ends_at)`, so remaining trial days aren't lost. The spec said `max(now, pro_until)`.
- **Double-tap returns the existing booking:** `create_booking` returns the existing active booking for an identical player + court + range.
- **Hold cap:** the 2-hold limit counts `held` bookings only. `pending_verification` is waiting on the venue, not the player.
- **Pricing past midnight:** each slot segment is priced by its own calendar day. A Friday 23:00 – Saturday 01:00 booking uses Saturday's rules after midnight.
- **Locked nav when a venue isn't Pro:** Analytics, Activity log and Team. Today, Calendar, Bookings, Check-in and Payments stay open and gate creation inside.
- **Who does what:**
  - Staff can mark cash payments as paid and mark no-shows.
  - Managers and above verify GCash proofs, create blocks and mark refunds.
- **Check-in and no-show timing:** check-in opens 2 h before start and closes at the end. No-show can be marked from 15 min after start.
- **Payment QR images:** readable only by venue members and by players with an active hold at that venue.

## File map
```
package.json · next.config.ts · tsconfig.json · eslint.config.mjs · vitest.config.ts · playwright.config.ts · components.json · .env.example
src/app/layout.tsx · globals.css · not-found.tsx · global-error.tsx
src/app/(marketing)/{layout,page,error}.tsx · for-venues/page.tsx · legal/[doc]/page.tsx
src/app/(public)/{layout,error}.tsx · courts/page.tsx
src/app/(auth)/layout.tsx · {login,signup,forgot-password,reset-password}/page.tsx · src/app/auth/callback/route.ts
src/app/(player)/{layout,error}.tsx · me/{bookings,favorites,profile,notifications}/page.tsx
src/app/owner/{layout,page,error}.tsx · owner/new/page.tsx · owner/[venueId]/layout.tsx · owner/[venueId]/[section]/page.tsx
src/app/admin/{layout,page,error}.tsx · admin/[section]/page.tsx
src/proxy.ts
src/components/ui/*  (shadcn)
src/components/brand/{logo,arch-frame,court-diagram,status-chip}.tsx · court-specs.ts
src/components/states/{delayed-skeleton,empty-state,error-state}.tsx
src/components/shell/{skip-link,site-header,site-footer,auth-slot,user-menu,app-sidebar,mobile-tab-bar,flash-toast}.tsx
src/features/auth/{schemas,actions}.ts · {password-field,demo-logins,login-form,signup-form,forgot-form,reset-form}.tsx
src/features/owner/nav.ts · src/features/admin/nav.ts
src/lib/design/contrast.ts · money.ts · codes.ts · permissions.ts · booking/status.ts · flash.ts
src/lib/auth/{redirect,session}.ts · src/lib/supabase/{env,client,server,admin,proxy,types}.ts
supabase/config.toml · migrations/*.sql · seed.sql · tests/*.test.sql
scripts/seed-photos.ts · tests/integration/booking-race.test.ts
e2e/{shell,auth,shells}.spec.ts · e2e/support/{global-setup,mail,auth,seed-ids}.ts
```

---

### Task 1: Scaffold, tokens, fonts, contrast gate

**Files:**
- Create (generated): the Next app at the repo root and `components.json`
- Create: `src/lib/design/contrast.ts`, `src/lib/design/contrast.test.ts`, `vitest.config.ts`
- Modify: `src/app/globals.css`, `src/app/layout.tsx`, `next.config.ts`, `package.json`

**Interfaces:**
- Produces:
  - `contrastRatio(a: string, b: string): number`
  - `readColorTokens(css: string): Record<string, string>` (keys without the `--color-` prefix)
  - Tailwind utilities `bg-clay`, `text-ink`, `font-display`, `font-sans`, `shadow-sun`, `rounded-card`
  - shadcn semantic variables mapped to the palette

- [ ] **Step 1: Scaffold.**
  1. Run `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes`. The existing `docs/` folder is allowed, and git gets initialised.
  2. Run `npx shadcn@latest init`, accepting the defaults (base colour neutral).
  3. Run `npm i -D vitest @vitejs/plugin-react vite-tsconfig-paths jsdom @testing-library/react @testing-library/dom @testing-library/user-event @testing-library/jest-dom`.

  Expected: `npm run build` passes.
- [ ] **Step 2: Write the failing test** `src/lib/design/contrast.test.ts`:
```ts
import { readFileSync } from 'node:fs';
import { contrastRatio, readColorTokens } from './contrast';

const tokens = readColorTokens(readFileSync('src/app/globals.css', 'utf8'));

it('matches WCAG reference values', () => {
  expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
  expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
});

const TEXT_PAIRS: [string, string][] = [
  ['ink', 'stucco'], ['ink', 'chalk'], ['ink', 'sand'], ['ink', 'greige'], ['ink', 'clay'],
  ['ink-soft', 'stucco'], ['ink-soft', 'chalk'], ['clay-ink', 'stucco'], ['clay-ink', 'chalk'],
  ['chalk', 'ink'], ['chalk', 'danger'], ['success', 'stucco'], ['warning', 'stucco'], ['danger', 'stucco'],
];
it.each(TEXT_PAIRS)('%s on %s is at least 4.5:1', (fg, bg) => {
  expect(tokens[fg], `missing --color-${fg}`).toBeDefined();
  expect(tokens[bg], `missing --color-${bg}`).toBeDefined();
  expect(contrastRatio(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(4.5);
});
it('chalk on clay is large-display only (>= 3:1)', () => {
  expect(contrastRatio(tokens.chalk, tokens.clay)).toBeGreaterThanOrEqual(3);
});
```
- [ ] **Step 3: Configure Vitest.**
  - `vitest.config.ts`: plugins `react()` and `tsconfigPaths()`.
  - `test.projects`:
    - `unit`: jsdom, `include: ['src/**/*.test.{ts,tsx}']`, `setupFiles: ['@testing-library/jest-dom/vitest']`, `globals: true`.
    - `integration`: node, `include: ['tests/integration/**/*.test.ts']`, with env from `loadEnv('test', cwd, '')` so `.env.local` is visible.
  - Scripts: `"test": "vitest run --project unit"` and `"test:integration": "vitest run --project integration"`.
- [ ] **Step 4: Run** `npm test`. Expected: FAIL with `Cannot find module './contrast'`.
- [ ] **Step 5: Implement `contrast.ts`.**
  - Use WCAG 2.x relative luminance (sRGB channel linearised with the 0.04045 threshold).
  - `readColorTokens` collects `/--color-([a-z-]+):\s*(#[0-9a-fA-F]{6})/g`.
- [ ] **Step 6: Tokens and fonts.**
  - In `globals.css`:
    - Add the 12 palette tokens to `@theme`, plus `--font-display: var(--font-fugaz)`, `--font-sans: var(--font-work-sans)`, `--radius-card: 14px` and `--shadow-sun: 10px 14px 28px -12px rgb(42 29 20 / 0.28)`.
    - Remap shadcn's `:root` variables:

      | shadcn variable | Palette token |
      |---|---|
      | background | stucco |
      | foreground | ink |
      | card, popover | chalk (foreground ink) |
      | primary | clay (foreground ink) |
      | secondary, accent | sand (foreground ink) |
      | muted | greige (foreground ink-soft) |
      | destructive | danger |
      | border, input | greige |
      | ring | clay-ink |

    - Delete the `.dark` block.
    - Base layer:
      - `body` gets the stucco background and ink colour.
      - `:focus-visible { outline: 2px solid var(--color-clay-ink); outline-offset: 2px }`.
      - A `.tabular` class sets `font-variant-numeric: tabular-nums`.
      - A `.grain` utility uses an inline SVG noise background at opacity ≤ 0.06.
  - In `layout.tsx`, load `Fugaz_One({ weight: '400', subsets: ['latin'], variable: '--font-fugaz', display: 'swap' })` and `Work_Sans({ subsets: ['latin'], variable: '--font-work-sans', display: 'swap' })`, and put both `.variable` classes on `<html lang="en">`.
  - In `next.config.ts`, set `cacheComponents: true` and `typedRoutes: true`.
- [ ] **Step 7: Run** `npm test`, `npm run build` and `npm run lint`. Expected: all pass.
- [ ] **Step 8: Propose commit** `chore: scaffold Next 16 app with Courtify tokens, fonts and contrast gate`

### Task 2: Core lib: money, booking codes, roles, statuses

**Files:** Create `src/lib/money.ts`, `src/lib/codes.ts`, `src/lib/permissions.ts` and `src/lib/booking/status.ts`, each with a sibling `*.test.ts`.

**Interfaces:**
- Produces:
  - `formatPHP(centavos: number): string` uses `Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })`, with 0 fraction digits for whole pesos and 2 otherwise.
  - `pesosToCentavos(pesos: number): number`
  - `BOOKING_CODE_ALPHABET`, `normalizeBookingCode(input: string): string | null`, `formatBookingCode(code: string): string`
  - `type VenueRole = 'owner' | 'manager' | 'staff'` and `roleAtLeast(role: VenueRole | null | undefined, min: VenueRole): boolean`
  - `BOOKING_STATUSES = ['held','pending_verification','confirmed','checked_in','completed','cancelled','expired','no_show'] as const`, `type BookingStatus`, and `BLOCKING_STATUSES = ['held','pending_verification','confirmed','checked_in']`

- [ ] **Step 1: Write the failing tests:**
```ts
expect(formatPHP(125000)).toBe('₱1,250');
expect(formatPHP(125050)).toBe('₱1,250.50');
expect(formatPHP(0)).toBe('₱0');
expect(pesosToCentavos(450.5)).toBe(45050);
expect(pesosToCentavos(0.1 + 0.2)).toBe(30);

expect(normalizeBookingCode(' k7q-2f9 ')).toBe('K7Q2F9');
expect(normalizeBookingCode('K7Q2F')).toBeNull();
expect(normalizeBookingCode('K7Q2F0')).toBeNull(); // 0 is not in the alphabet
expect(normalizeBookingCode('K7Q2FI')).toBeNull(); // I is not in the alphabet
expect(formatBookingCode('K7Q2F9')).toBe('K7Q-2F9');

expect(roleAtLeast('owner', 'manager')).toBe(true);
expect(roleAtLeast('manager', 'manager')).toBe(true);
expect(roleAtLeast('staff', 'manager')).toBe(false);
expect(roleAtLeast(null, 'staff')).toBe(false);
```
- [ ] **Step 2: Run** `npm test`. Expected: FAIL (modules missing).
- [ ] **Step 3: Implement** the four modules with the signatures above.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Propose commit** `feat: money, booking-code, role and status helpers`

### Task 3: UI primitives, brand and state components

**Files:**
- Create via CLI: `npx shadcn@latest add button input label textarea checkbox select dialog sheet dropdown-menu popover tooltip avatar badge separator skeleton sonner tabs field`
- Modify: `src/components/ui/button.tsx`
- Create: `src/components/brand/{logo.tsx,arch-frame.tsx,court-specs.ts,court-diagram.tsx,status-chip.tsx}` and `src/components/states/{delayed-skeleton.tsx,empty-state.tsx,error-state.tsx}`, each with a sibling `*.test.tsx`
- Install: `npm i lucide-react` (if shadcn didn't add it)

**Interfaces:**
- Produces:
  - **`Button` variants:**
    - `default`: clay background, ink label, pill shape.
    - `secondary`: chalk background with a greige border.
    - `outline` and `ghost`.
    - `destructive`: danger background, chalk label.
    - `link`: clay-ink.
  - **`<Logo className? />`:** a "Courtify" wordmark in `font-display`, where the dot of the "i" is a clay circle. Root is `role="img" aria-label="Courtify"`.
  - **`<ArchFrame ratio?: '4/5' | '1/1' | '3/4' className?>`:** arch-topped radius (`9999px 9999px var(--radius-card) var(--radius-card)`), `shadow-sun`, `overflow-hidden`.
  - **Court specs:**
    - `type SportSlug = 'pickleball' | 'badminton' | 'tennis' | 'padel' | 'table-tennis' | 'squash'`
    - `COURT_LINE_COUNT = 16`
    - `COURT_SPECS: Record<SportSlug, { label: string; width: number; length: number; netY: number | null; lines: [number, number, number, number][] }>`
    - Coordinates are in metres, with the origin at the top-left and length running along y. Unused entries are zero-length lines at the court centre, so every sport has exactly 16 lines and M1 can morph between them.
    - `court-specs.ts` must have no imports and no TS-only runtime syntax, because `scripts/seed-photos.ts` imports it under Node's type stripping.
  - **`<CourtDiagram sport strokeWidth? className? />`:** an `<svg role="img" aria-label="{label} court diagram">` containing a surface rect, the lines, and a dashed net when `netY` is set.
  - **`<StatusChip status: BookingStatus />`:** an icon with `aria-hidden`, plus a word and `data-variant={status}`:

    | Status | Icon | Word | Style |
    |---|---|---|---|
    | held | Hourglass | Held | dashed border |
    | pending_verification | ReceiptText | Verifying | dotted border |
    | confirmed | CircleCheck | Confirmed | solid clay-ink border |
    | checked_in | DoorOpen | Checked in | ink fill, chalk text |
    | completed | Flag | Completed | outline |
    | cancelled | CircleX | Cancelled | line-through |
    | expired | TimerOff | Expired | 60% opacity |
    | no_show | UserX | No-show | hatched background |

  - **`<DelayedSkeleton delayMs = 250 lines = 3 className? />`:** renders `data-testid="delayed-skeleton"` once the delay has passed.
  - **`<EmptyState icon? title description? action? />`**
  - **`<ErrorState title = 'Something went wrong' description? onRetry? />`:** `role="alert"`, with a "Try again" button when `onRetry` is set.
- Court dimensions (metres):

  | Sport | Width × length | Lines besides the outer boundary |
  |---|---|---|
  | tennis | 10.97 × 23.77, net at the middle | singles sidelines 1.37 in from each side; service lines 6.40 m each side of the net; centre service line between the service lines; 0.10 m centre marks |
  | badminton | 6.10 × 13.40, net at the middle | singles sidelines 0.46 in; short service lines 1.98 m each side of the net; doubles long service lines 0.76 m in from each back line; centre lines from each short service line to the back |
  | pickleball | 6.10 × 13.41, net at the middle | non-volley lines 2.13 m each side of the net; centre lines from each non-volley line to the baseline |
  | padel | 10 × 20, net at the middle | service lines 6.95 m each side of the net; centre service line between them |
  | table-tennis | 1.525 × 2.74, net at the middle | lengthwise centre line |
  | squash | 6.40 × 9.75, no net (front wall at y = 0) | short line at y = 5.44; half-court line from the short line to the back; two 1.60 × 1.60 service boxes behind the short line against each side wall |

- [ ] **Step 1: Write the failing tests:**
```tsx
// delayed-skeleton.test.tsx
vi.useFakeTimers();
render(<DelayedSkeleton />);
act(() => { vi.advanceTimersByTime(249); });
expect(screen.queryByTestId('delayed-skeleton')).toBeNull();
act(() => { vi.advanceTimersByTime(1); });
expect(screen.getByTestId('delayed-skeleton')).toBeInTheDocument();
vi.useRealTimers();

// status-chip.test.tsx
const WORDS = { held: 'Held', pending_verification: 'Verifying', confirmed: 'Confirmed', checked_in: 'Checked in',
  completed: 'Completed', cancelled: 'Cancelled', expired: 'Expired', no_show: 'No-show' } as const;
it.each(BOOKING_STATUSES)('%s prints its word and an icon', (s) => {
  const { container } = render(<StatusChip status={s} />);
  expect(screen.getByText(WORDS[s])).toBeInTheDocument();
  expect(container.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
});
it('every status has a distinct variant', () => {
  const variants = BOOKING_STATUSES.map((s) =>
    render(<StatusChip status={s} />).container.firstElementChild!.getAttribute('data-variant'));
  expect(new Set(variants).size).toBe(BOOKING_STATUSES.length);
});

// court-diagram.test.tsx
it.each(Object.keys(COURT_SPECS) as SportSlug[])('%s renders an accessible 16-line diagram', (sport) => {
  render(<CourtDiagram sport={sport} />);
  expect(screen.getByRole('img', { name: `${COURT_SPECS[sport].label} court diagram` })).toBeInTheDocument();
  expect(COURT_SPECS[sport].lines).toHaveLength(COURT_LINE_COUNT);
});

// error-state.test.tsx
const onRetry = vi.fn();
render(<ErrorState onRetry={onRetry} />);
expect(screen.getByRole('alert')).toBeInTheDocument();
await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
expect(onRetry).toHaveBeenCalledOnce();

// logo.test.tsx
render(<Logo />);
expect(screen.getByRole('img', { name: 'Courtify' })).toBeInTheDocument();
```
- [ ] **Step 2: Run** `npm test`. Expected: FAIL (components missing).
- [ ] **Step 3: Implement** the components with the interfaces above, and restyle the Button variants.
- [ ] **Step 4: Run** `npm test` and `npm run build`. Expected: PASS.
- [ ] **Step 5: Propose commit** `feat: brand, state and shadcn primitives in the Courtify style`

### Task 4: Site shell, a11y baseline, 404 and errors, Playwright

**Files:**
- Create:
  - `src/components/shell/{skip-link,site-header,site-footer}.tsx`
  - `src/app/(marketing)/{layout,page,error}.tsx`, `(marketing)/for-venues/page.tsx`, `(marketing)/legal/[doc]/page.tsx`
  - `src/app/(public)/{layout,error}.tsx`, `(public)/courts/page.tsx`
  - `src/app/not-found.tsx`, `src/app/global-error.tsx`
  - `playwright.config.ts`, `e2e/shell.spec.ts`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces:
  - **`<SiteHeader authSlot?: ReactNode />`:** logo link, "Find courts" (`/courts`) and "For venues" (`/for-venues`, hidden below `sm` but still in the footer). Defaults to a "Sign in" link to `/login`; Task 18 passes the real auth slot.
  - **`<SiteFooter />`:** links to Terms (`/legal/terms`), Privacy (`/legal/privacy`) and For venues, plus the text `© Courtify`. There's no runtime date, because Cache Components prerenders it.
  - **`<SkipLink />`:** the first element in `<body>`, `href="#main"`, text "Skip to content".
  - **Main landmark:** every layout and `not-found` render `<main id="main" tabIndex={-1}>`.
  - **Root layout:**
    - metadata `title: { default: 'Courtify — Book racket courts near you', template: '%s · Courtify' }`
    - `<Toaster position="top-center" />`
  - **Placeholder pages:**
    - `/legal/[doc]` accepts `terms | privacy` through `generateStaticParams`; anything else calls `notFound()`. Content is an EmptyState reading "Draft — not legal advice".
    - `/courts` and `/for-venues` render EmptyState placeholders, filled in by M1 and M2.
  - **`not-found.tsx`:** includes SiteHeader and SiteFooter (group layouts don't wrap it), the h1 "That page is out of bounds.", a tennis CourtDiagram, and `metadata.title = 'Page not found'`.
  - **Error boundaries:** each `error.tsx` renders `ErrorState` with `onRetry={reset}`. `global-error.tsx` has its own `<html>` and `<body>`.
  - **Playwright config:**
    - `webServer: { command: 'npm run build && npm run start -- -p 3107', url: 'http://localhost:3107', reuseExistingServer: false, timeout: 240_000, env: { NEXT_PUBLIC_SITE_URL: 'http://localhost:3107' } }`
    - `use.baseURL = 'http://localhost:3107'`
    - projects `desktop` (Desktop Chrome) and `mobile` (Pixel 7)
    - script `"test:e2e": "playwright test"`, then run `npx playwright install chromium`

- [ ] **Step 1: Write the failing tests** `e2e/shell.spec.ts`:
```ts
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
test('home has a title and exactly one h1', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Courtify/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
});
```
- [ ] **Step 2: Run** `npm run test:e2e`. Expected: FAIL (no skip link, default 404).
- [ ] **Step 3: Implement** the shell, the pages and the config listed above.
- [ ] **Step 4: Run** `npm run test:e2e`. Expected: PASS on both projects.
- [ ] **Step 5: Propose commit** `feat: site shell with skip link, styled 404 and error boundaries`

### Task 5: Local Supabase, identity schema, pgTAP harness

**Files:**
- Create:
  - via `npx supabase init`: `supabase/config.toml`
  - via `npx supabase migration new`: `supabase/migrations/<ts>_extensions.sql` and `<ts>_identity.sql`
  - `supabase/tests/000_setup.test.sql`, `supabase/tests/010_identity.test.sql`
  - `.env.example` and `.env.local` (gitignored)
- Modify: `package.json`
  - Run `npm i -D supabase`.
  - Add scripts:
    - `db:start`: `npx supabase start`
    - `db:stop`: `npx supabase stop`
    - `db:reset`: `npx supabase db reset` (extended in Task 15)
    - `db:test`: `npx supabase test db`
    - `db:types`: `npx supabase gen types typescript --local > src/lib/supabase/types.ts`

**Interfaces:**
- Produces:
  - **`config.toml`:**
    - `project_id = "courtify"`
    - `[auth] site_url = "http://localhost:3000"`
    - `additional_redirect_urls = ["http://localhost:3000/**", "http://localhost:3107/**"]`
    - `[auth.email] enable_confirmations = true`
    - `[auth.rate_limit] email_sent = 100`, so the e2e auth tests aren't throttled
  - **Extensions:** `postgis`, `btree_gist` and `pg_trgm` go `with schema extensions`. Install `pg_cron` the Supabase way: `create extension pg_cron with schema pg_catalog` and `grant usage on schema cron to postgres`.
  - **`public.profiles`:** `id uuid pk → auth.users on delete cascade`, `full_name text not null default ''`, `phone text`, `avatar_path text`, `created_at`, `updated_at`.
    - The `on_auth_user_created` trigger calls `public.handle_new_user()` (definer), which copies only `raw_user_meta_data->>'full_name'`.
    - RLS: select own row or admin, update own row.
    - Grants: `revoke update on public.profiles from anon, authenticated` then `grant update (full_name, phone, avatar_path) on public.profiles to authenticated`. No client insert or delete.
  - **`public.platform_admins`:** `user_id uuid pk → auth.users on delete cascade`, `created_at`. RLS: select own row or admin. No client writes.
  - **Functions:** `public.is_platform_admin() returns boolean` (stable, definer) and `public.set_updated_at()` (a reusable trigger function).
  - **`.env.example` keys:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SITE_URL=http://localhost:3000`. Fill `.env.local` from `npx supabase status -o env`: `API_URL`, then `PUBLISHABLE_KEY` (or `ANON_KEY`) and `SECRET_KEY` (or `SERVICE_ROLE_KEY`).
  - **pgTAP helpers** in schema `tests`, created by `000_setup.test.sql`:
    - They persist: they're created outside a transaction with `create or replace`, and the file ends with a 1-assertion plan.
    - The file runs `create extension if not exists pgtap with schema extensions`.
    - Usage on the schema and execute on its functions are granted to `anon` and `authenticated`.

    | Helper | Notes |
    |---|---|
    | `tests.create_user(p_email text, p_full_name text default 'Test User', p_phone text default '+639170000000') returns uuid` | definer; inserts into `auth.users` and sets the phone on the profile |
    | `tests.authenticate_as(p_user uuid) returns void` | invoker; `set_config('role','authenticated',true)` + `request.jwt.claims` `{sub, role}` |
    | `tests.authenticate_as_anon() returns void` | |
    | `tests.as_postgres() returns void` | `set_config('role','none',true)` |
    | `tests.make_admin(p_user uuid) returns void` | definer |
    | `tests.error_detail(p_sql text) returns text` | runs the SQL and returns `PG_EXCEPTION_DETAIL` from the error it raises |
    | `tests.manila(p_date date, p_time time) returns timestamptz` | `(p_date + p_time) at time zone 'Asia/Manila'` |

- [ ] **Step 1: Init and configure.** Run `npm i -D supabase`, `npx supabase init`, then edit `config.toml` as above. Run `npm run db:start` and write `.env.local`.
- [ ] **Step 2: Write `000_setup.test.sql`** with the helpers, then the failing test `010_identity.test.sql`. Capture fixtures with `\gset`, e.g. `select tests.create_user('alice@t.test','Alice') as alice \gset`.
```sql
begin;
select plan(12);
select tests.create_user('alice@t.test', 'Alice') as alice \gset
select tests.create_user('bob@t.test', 'Bob') as bob \gset
select is((select full_name from public.profiles where id = :'alice'), 'Alice', 'profile is created from signup metadata');
select tests.authenticate_as(:'alice');
select is((select count(*)::int from public.profiles), 1, 'a user sees only their own profile');
select lives_ok($$ update public.profiles set full_name = 'Alice P' where id = auth.uid() $$, 'user can rename themselves');
select results_eq(format($$ with u as (update public.profiles set full_name = 'x' where id = %L returning 1) select count(*)::int from u $$, :'bob'),
  $$ values (0) $$, 'user cannot update another profile');
select throws_ok($$ insert into public.profiles (id) values (gen_random_uuid()) $$, '42501', null, 'profiles cannot be inserted directly');
select throws_ok($$ update public.profiles set id = id $$, '42501', null, 'only granted columns are updatable');
select is(public.is_platform_admin(), false, 'a normal user is not admin');
select throws_ok($$ insert into public.platform_admins (user_id) values (auth.uid()) $$, '42501', null, 'users cannot make themselves admin');
select tests.as_postgres();
update auth.users set raw_user_meta_data = raw_user_meta_data || '{"role":"admin","is_admin":true}' where id = :'bob';
select tests.authenticate_as(:'bob');
select is(public.is_platform_admin(), false, 'user metadata never grants admin');
select tests.as_postgres();
select tests.make_admin(:'bob');
select tests.authenticate_as(:'bob');
select is(public.is_platform_admin(), true, 'platform_admins row grants admin');
select is((select count(*)::int from public.profiles where id in (:'alice', :'bob')), 2, 'admin sees every profile');
select tests.authenticate_as_anon();
select is((select count(*)::int from public.profiles), 0, 'anon sees no profiles');
select * from finish();
rollback;
```
- [ ] **Step 3: Run** `npm run db:test`. Expected: FAIL (`relation "public.profiles" does not exist`).
- [ ] **Step 4: Write the two migrations** with the interfaces above.
- [ ] **Step 5: Run** `npm run db:reset && npm run db:test`. Expected: PASS.
- [ ] **Step 6: Propose commit** `feat(db): local Supabase, identity schema and pgTAP harness`

### Task 6: Catalog, venues domain, settings, access helpers

**Files:** Create migrations `<ts>_catalog.sql` and `<ts>_venues.sql`, and the test `supabase/tests/020_venues.test.sql`.

**Interfaces:**
- **Enums:**
  - `venue_status`: `draft`, `pending_review`, `active`, `rejected`, `suspended`
  - `member_role`: `owner`, `manager`, `staff`
  - `payment_mode`: `at_venue`, `gcash_proof`
- **`sports(id uuid pk, slug text unique, name, sort smallint)`**, seeded in the migration: pickleball, badminton, tennis, padel, table-tennis, squash.
- **`amenities`**, same shape, seeded: parking, showers, locker-rooms, equipment-rental, coaching, cafe, wifi, air-conditioning, seating, first-aid, pro-shop, wheelchair-access.
- **`venues` columns:**
  - id
  - `slug`: unique, `^[a-z0-9]+(-[a-z0-9]+)*$`
  - name, description, address_line, city, province
  - `location extensions.geography(point,4326)`
  - `timezone`: default `'Asia/Manila'`
  - phone, messenger_url, facebook_url
  - `status`: default `draft`
  - review_note, submitted_at, approved_at
  - `slot_minutes`: 30 or 60, default 60
  - `min_duration_minutes`: default 60
  - `max_duration_minutes`: default 180
  - `advance_days`: 1–60, default 14
  - `min_lead_minutes`: default 30
  - `cancel_cutoff_hours`: default 12
  - `payment_mode`: default `at_venue`
  - `hold_minutes`: 10–120, default 30
  - trial_ends_at, pro_until
  - `search tsvector`: generated stored, `to_tsvector('simple', coalesce(name,'')||' '||coalesce(city,'')||' '||coalesce(province,'')||' '||coalesce(description,''))`
  - created_by → auth.users, created_at, updated_at

  Checks: both durations are multiples of `slot_minutes`, and max ≥ min.
- **`venue_payment_details`:** `venue_id pk → venues on delete cascade`, gcash_name, gcash_number, gcash_qr_path, updated_at.
- **`venue_members`:** `(venue_id, user_id) pk`, `role member_role`, created_at.
- **`venue_invites`:** id, venue_id, `role` (check `role <> 'owner'`), `token_hash` (unique), expires_at, created_by, used_by, used_at, created_at.
- **`venue_photos`:** id, venue_id, `path` (unique; the base path `{venue_id}/{id}`, files are `{path}-{480|960|1600}.webp`), width, height, sort, `alt` (default `''`), created_at.
- **`venue_amenities`:** `(venue_id, amenity_id) pk`.
- **`venue_hours`:** `(venue_id, weekday) pk`, where `weekday` is 0–6 and 0 = Sunday; opens_at, closes_at, `is_closed` (default false). When `closes_at <= opens_at` the venue closes the next day; equal means 24 h.
- **`courts`:** id, venue_id, sport_id, name, `surface` (in `hard`, `clay`, `synthetic-grass`, `wood`, `rubber`, `concrete`, `other`), is_indoor, has_lights, `base_rate_centavos` (> 0), `is_active` (default true), sort, created_at. Unique on `(venue_id, name)` and on `(id, venue_id)`.
- **`court_rates`:** id, court_id, `weekdays smallint[]` (non-empty, values 0–6), starts_at, ends_at (`ends_at > starts_at`, `'24:00'` allowed), `rate_centavos` (> 0). A trigger raises `rate_overlap` when two rules on the same court share a weekday and overlap in time.
- **`platform_settings`:** `id boolean pk default true check (id)`, pro_monthly_centavos 99900, pro_yearly_centavos 999000, trial_days 30, grace_days 7, payout_gcash_name, payout_gcash_number, payout_gcash_qr_path, payout_bank_details, announcement, updated_at. Insert its single row.
- **Functions:**

  | Function | Behaviour |
  |---|---|
  | `member_role_rank(member_role) returns int` | immutable: staff 1, manager 2, owner 3 |
  | `venue_role(p_venue_id uuid) returns member_role` | the caller's role, or null |
  | `has_venue_role(p_venue_id uuid, p_min member_role) returns boolean` | |
  | `venue_has_pro(p_venue_id uuid) returns boolean` | `now() < greatest(coalesce(pro_until,'-infinity'), coalesce(trial_ends_at,'-infinity')) + grace_days` |

  All are definer, stable, `search_path = ''`.
- **Triggers:**
  - after insert on `venues` (definer): inserts the creator as `owner` and creates an empty `venue_payment_details` row
  - before update or delete on `venue_members`: raises `last_owner` if a venue would be left without an owner
  - `set_updated_at` on venues, payment details and settings
- **Privileges and RLS:**
  - **`sports`, `amenities`:** anyone can select; only admins write.
  - **`venues`:**
    - Select when `status = 'active' or has_venue_role(id,'staff') or is_platform_admin()`.
    - Insert is column-granted (`slug`, `name`, `description`, `address_line`, `city`, `province`, `location`, `phone`, `messenger_url`, `facebook_url`, `created_by`) with check `created_by = auth.uid()`.
    - Update requires `has_venue_role(id,'manager')`, column-granted to the profile, contact and booking-setting columns only. Status, trial, pro, slug and created_by columns aren't granted.
    - Delete requires owner and `status in ('draft','rejected')`.
  - **Venue children** (photos, amenities, hours, courts, court_rates via their court): select follows parent-venue visibility; insert, update and delete require `has_venue_role(venue_id,'manager')`.
  - **`venue_payment_details`:** select and update for managers and up, and admins.
  - **`venue_members`:** select when `user_id = auth.uid() or has_venue_role(venue_id,'staff') or admin`; writes are owner-only.
  - **`venue_invites`:** owner-only for every operation.
  - **`platform_settings`:**
    - `anon` gets select on (pro_monthly_centavos, pro_yearly_centavos, trial_days, grace_days, announcement).
    - `authenticated` can select all columns.
    - Update is admin-only.

- [ ] **Step 1: Write the failing test** `020_venues.test.sql`.

  Fixtures (as postgres):
  - users owner, manager, staff, outsider
  - an active venue `v` created by owner, with manager and staff as members and court `c` (base 40000)
  - a draft venue `d` owned by owner

  Assertions:
```sql
select tests.authenticate_as_anon();
select is((select count(*)::int from public.venues where id in (:'v', :'d')), 1, 'anon sees active venues only');
select tests.authenticate_as(:'outsider');
select is((select count(*)::int from public.venues where id = :'d'), 0, 'non-members cannot see drafts');
select lives_ok($$ insert into public.venues (slug, name, created_by) values ('t-new-place', 'New Place', auth.uid()) $$, 'any user can start a venue');
select is((select m.role::text from public.venue_members m join public.venues x on x.id = m.venue_id where x.slug = 't-new-place'), 'owner', 'creator becomes owner');
select is((select status::text from public.venues where slug = 't-new-place'), 'draft', 'new venues start as drafts');
select throws_ok($$ insert into public.venues (slug, name, created_by, status) values ('t-sneaky', 'S', auth.uid(), 'active') $$, '42501', null, 'status cannot be chosen on insert');
select tests.authenticate_as(:'owner');
select throws_ok(format($$ update public.venues set status = 'active' where id = %L $$, :'d'), '42501', null, 'owners cannot set status directly');
select tests.authenticate_as(:'manager');
select results_eq(format($$ with u as (update public.courts set name = 'Court A' where id = %L returning 1) select count(*)::int from u $$, :'c'), $$ values (1) $$, 'managers edit courts');
select is((select count(*)::int from public.venue_payment_details where venue_id = :'v'), 1, 'managers read payment details');
select lives_ok(format($$ insert into public.court_rates (court_id, weekdays, starts_at, ends_at, rate_centavos) values (%L, '{1,2,3,4,5}', '18:00', '22:00', 60000) $$, :'c'), 'peak rate saved');
select throws_ok(format($$ insert into public.court_rates (court_id, weekdays, starts_at, ends_at, rate_centavos) values (%L, '{5,6}', '21:00', '23:00', 70000) $$, :'c'), 'P0001', 'rate_overlap', 'overlapping rule on a shared weekday is rejected');
select lives_ok(format($$ insert into public.court_rates (court_id, weekdays, starts_at, ends_at, rate_centavos) values (%L, '{6}', '18:00', '22:00', 70000) $$, :'c'), 'same hours on another weekday is fine');
select tests.authenticate_as(:'staff');
select results_eq(format($$ with u as (update public.courts set name = 'Court Z' where id = %L returning 1) select count(*)::int from u $$, :'c'), $$ values (0) $$, 'staff cannot edit courts');
select is((select count(*)::int from public.venue_payment_details where venue_id = :'v'), 0, 'staff cannot read payment details');
select tests.authenticate_as(:'owner');
select throws_ok(format($$ delete from public.venue_members where venue_id = %L and user_id = auth.uid() $$, :'v'), 'P0001', 'last_owner', 'a venue always keeps an owner');
select tests.as_postgres();
update public.venues set trial_ends_at = now() + interval '5 days', pro_until = null where id = :'v';
select is(public.venue_has_pro(:'v'), true, 'trial grants Pro');
update public.venues set trial_ends_at = null, pro_until = now() - interval '3 days' where id = :'v';
select is(public.venue_has_pro(:'v'), true, 'grace keeps Pro for 7 days');
update public.venues set pro_until = now() - interval '8 days' where id = :'v';
select is(public.venue_has_pro(:'v'), false, 'Pro ends after grace');
update public.venues set pro_until = null where id = :'v';
select is(public.venue_has_pro(:'v'), false, 'no trial and no subscription is free');
select tests.authenticate_as_anon();
select is((select pro_monthly_centavos from public.platform_settings), 99900, 'anon reads the Pro price');
select throws_ok($$ select payout_gcash_number from public.platform_settings $$, '42501', null, 'anon cannot read payout details');
```
- [ ] **Step 2: Run** `npm run db:test`. Expected: FAIL.
- [ ] **Step 3: Write the migrations** with the interfaces above.
- [ ] **Step 4: Run** `npm run db:reset && npm run db:test`. Expected: PASS.
- [ ] **Step 5: Propose commit** `feat(db): venues domain, roles, Pro entitlement and settings`

### Task 7: Bookings core

**Files:** Create migration `<ts>_bookings.sql` and test `supabase/tests/030_bookings_core.test.sql`.

**Interfaces:**
- **Enums:**
  - `booking_kind`: `online`, `walk_in`, `block`
  - `booking_status`: the 8 values, in Task 2's order
  - `payment_status`: `unpaid`, `proof_submitted`, `paid`, `refund_due`, `refunded`, `waived`
  - `proof_status`: `submitted`, `verified`, `rejected`
- **`public.gen_booking_code() returns text`:** volatile, uses the Global Constraints alphabet.
- **`bookings` columns:**
  - id
  - `code`: unique, default `gen_booking_code()`
  - venue_id, court_id
  - `player_id`: → profiles, on delete set null
  - kind, customer_name, customer_phone
  - `during tstzrange not null`: check `lower_inc(during) and not upper_inc(during) and not isempty(during)`
  - status, hold_expires_at
  - `price_total_centavos`: int ≥ 0
  - payment_mode, payment_status, notes, reminded_at, created_by, created_at, cancelled_at, cancel_reason, checked_in_at, checked_in_by

  Constraints and indexes:
  - FK `(court_id, venue_id) → courts(id, venue_id)`.
  - Check `status <> 'held' or hold_expires_at is not null`.
  - Exclusion: `exclude using gist (court_id with =, during with &&) where (status in ('held','pending_verification','confirmed','checked_in'))`.
  - Indexes on `(venue_id, lower(during))`, on `(player_id, created_at)`, and a partial index on `(hold_expires_at) where status = 'held'`.
- **`booking_payments`:** id, booking_id, amount_centavos, reference_no, proof_path, `status` (default `submitted`), submitted_by, submitted_at, reviewed_by, reviewed_at, reason.
- **`booking_events`:** `id bigint identity`, booking_id, actor_id, from_status, to_status, note, created_at.
  - The trigger `log_booking_status()` fires after insert (with `from_status` null) and after an update that changes status.
  - It records `actor_id = auth.uid()`, and `note = cancel_reason` when the booking moves to `cancelled`.
- **RLS select:**
  - `bookings` and `booking_events`: `player_id = auth.uid() or has_venue_role(venue_id,'staff') or is_platform_admin()`
  - `booking_payments`: the booking's player, `has_venue_role(venue_id,'manager')`, or admin
  - Revoke insert, update and delete on all three from `anon` and `authenticated`.
- **New profiles policy:** staff and up can select the profiles of players who have bookings at their venue.

- [ ] **Step 1: Write the failing test** `030_bookings_core.test.sql`.

  Fixtures:
  - venue `v` with courts `c1`, `c2`, and another venue `w`
  - players `p1`, `p2`
  - `s` is staff at `v`, `s2` is staff at `w`
  - inserts run as postgres

  Assertions:
```sql
select lives_ok(format($$ insert into public.bookings (id, venue_id, court_id, player_id, kind, during, status, payment_mode, payment_status)
  values (%L, %L, %L, %L, 'online', '[2030-01-07 10:00+08,2030-01-07 11:00+08)', 'confirmed', 'at_venue', 'unpaid') $$, :'b1', :'v', :'c1', :'p1'), 'first booking');
select throws_ok(<same court, [10:30,11:30), confirmed>, '23P01', null, 'overlap on the same court is impossible');
select lives_ok(<c1, [11:00,12:00), confirmed>, 'back-to-back bookings are allowed');
select lives_ok(<c2, [10:00,11:00), confirmed>, 'same time on another court is fine');
select lives_ok(<c1, [10:00,11:00), cancelled>, 'cancelled rows do not block');
select throws_ok(<court c1 with venue w>, '23503', null, 'court must belong to the booking venue');
update public.bookings set status = 'checked_in' where id = :'b1';
select is((select array_agg(to_status::text order by id) from public.booking_events where booking_id = :'b1'), array['confirmed','checked_in'], 'status changes are logged');
select tests.authenticate_as(:'p2');
select is((select count(*)::int from public.bookings where venue_id = :'v'), 0, 'players see only their own bookings');
select throws_ok(format($$ update public.bookings set status = 'cancelled' where id = %L $$, :'b1'), '42501', null, 'clients cannot change status directly');
select tests.authenticate_as(:'s');
select is((select count(*)::int from public.bookings where venue_id = :'v'), <fixture count at v>, 'venue staff see every venue booking');
select is((select full_name from public.profiles where id = :'p1'), 'P One', 'venue staff can read their bookers'' names');
select tests.authenticate_as(:'s2');
select is((select count(*)::int from public.bookings where venue_id = :'v'), 0, 'other venues see nothing');
select tests.authenticate_as_anon();
select is((select count(*)::int from public.bookings where venue_id = :'v'), 0, 'anon sees nothing');
select matches(public.gen_booking_code(), '^[A-HJKMNP-Z2-9]{6}$', 'codes use the unambiguous alphabet');
select tests.as_postgres();
delete from auth.users where id = :'p1';
select is((select player_id from public.bookings where id = :'b1'), null, 'deleting a player keeps the booking');
select tests.authenticate_as(:'s');
select is((select count(*)::int from public.bookings where id = :'b1'), 1, 'venue staff still see it');
```
- [ ] **Step 2: Run** `npm run db:test`. Expected: FAIL.
- [ ] **Step 3: Write the migration.**
- [ ] **Step 4: Run** `npm run db:reset && npm run db:test`. Expected: PASS.
- [ ] **Step 5: Propose commit** `feat(db): bookings with overlap exclusion, events and RLS`

### Task 8: Notifications, favorites, audit log

**Files:** Create migration `<ts>_social_audit.sql` and test `supabase/tests/040_social_audit.test.sql`.

**Interfaces:**
- **`favorites`:** `(user_id → auth.users cascade, venue_id → venues cascade) pk`, created_at. RLS: own rows, every operation.
- **`notifications`:** `id bigint identity`, user_id, type, `payload jsonb` (default `'{}'`), read_at, created_at. RLS: select and delete own rows; update own rows with a column grant on `read_at` only; clients can't insert.
- **Notification functions** (definer; execute revoked from `public`, `anon` and `authenticated`):
  - `public.notify(p_user_id uuid, p_type text, p_payload jsonb default '{}') returns void`
  - `public.notify_venue(p_venue_id uuid, p_min member_role, p_type text, p_payload jsonb) returns void`
  - `public.notify_admins(p_type text, p_payload jsonb) returns void`
- **Notification types:** `booking_created`, `booking_proof_submitted`, `booking_confirmed`, `booking_payment_rejected`, `booking_cancelled`, `booking_reminder`, `venue_submitted`, `venue_approved`, `venue_rejected`, `venue_suspended`, `subscription_submitted`, `subscription_verified`, `subscription_rejected`, `pro_expiring`.
- **`audit_log`:** `id bigint identity`, actor_id, venue_id, entity, entity_id, `action` (insert, update or delete), `diff jsonb`, created_at.
  - Trigger `public.audit_row()` runs after insert, update and delete, for each row, on venues, venue_payment_details, venue_members, venue_photos, venue_amenities, venue_hours, courts and court_rates.
  - `diff`:
    - insert: the new row
    - update: `{column: [old, new]}` for changed columns only
    - delete: the old row
    - `updated_at` and `search` are ignored.
  - `venue_id` comes from the row itself, or via `courts` for `court_rates`.
  - The trigger skips when `current_setting('courtify.seeding', true) = 'on'`.
  - RLS select: `has_venue_role(venue_id,'manager') or is_platform_admin()`.

- [ ] **Step 1: Write the failing test** `040_social_audit.test.sql`.

  Fixtures: venue `v` with court `c` (base 40000), owner, manager `m`, staff `s`, players `p1`, `p2`.
```sql
select tests.authenticate_as(:'p1');
select lives_ok(format($$ insert into public.favorites (user_id, venue_id) values (auth.uid(), %L) $$, :'v'), 'players can save venues');
select throws_ok(format($$ insert into public.favorites (user_id, venue_id) values (%L, %L) $$, :'p2', :'v'), '42501', null, 'cannot save for someone else');
select throws_ok($$ select public.notify(auth.uid(), 'x', '{}') $$, '42501', null, 'clients cannot call notify');
select tests.as_postgres();
select public.notify(:'p1', 'booking_confirmed', '{"booking_id":"x"}');
select tests.authenticate_as(:'p2');
select is((select count(*)::int from public.notifications), 0, 'notifications are private');
select tests.authenticate_as(:'p1');
select results_eq($$ with u as (update public.notifications set read_at = now() returning 1) select count(*)::int from u $$, $$ values (1) $$, 'owner marks read');
select throws_ok($$ update public.notifications set type = 'hacked' $$, '42501', null, 'only read_at is writable');
select tests.authenticate_as(:'m');
update public.courts set base_rate_centavos = 50000 where id = :'c';
select tests.as_postgres();
select is((select diff -> 'base_rate_centavos' from public.audit_log where entity = 'courts' and entity_id = :'c'::text order by id desc limit 1), '[40000, 50000]'::jsonb, 'audit stores only changed columns as [old, new]');
select is((select actor_id from public.audit_log where entity = 'courts' and entity_id = :'c'::text order by id desc limit 1), :'m'::uuid, 'audit records the actor');
select tests.authenticate_as(:'s');
select is((select count(*)::int from public.audit_log where venue_id = :'v'), 0, 'staff cannot read the audit log');
select tests.authenticate_as(:'owner');
select ok((select count(*) from public.audit_log where venue_id = :'v') > 0, 'owners read their venue audit log');
```
- [ ] **Step 2: Run** `npm run db:test`. Expected: FAIL.
- [ ] **Step 3: Write the migration.**
- [ ] **Step 4: Run** `npm run db:reset && npm run db:test`. Expected: PASS.
- [ ] **Step 5: Propose commit** `feat(db): favorites, notifications and audit trail`

### Task 9: Booking engine (pricing, hours, availability, create_booking)

**Files:**
- Create: migration `<ts>_booking_engine.sql`, test `supabase/tests/050_booking_engine.test.sql`, and `tests/integration/booking-race.test.ts`
- Install: `npm i @supabase/supabase-js` (if it isn't installed yet)

**Interfaces:** All functions are definer with `search_path = ''`.
- **`public.session_bounds(p_venue_id uuid, p_date date) returns tstzrange`:** the operating session that starts on local day `p_date`, from `opens_at` to `closes_at` (on the next day when `closes_at <= opens_at`). Returns null when the venue is closed that day.
- **`public.is_within_hours(p_venue_id uuid, p_starts_at timestamptz, p_ends_at timestamptz) returns boolean`:** true when the range fits inside the session of the start's local date, or of the day before.
- **`public.validate_booking_range(p_court_id uuid, p_starts_at timestamptz, p_minutes integer, p_enforce_window boolean) returns public.venues`:** internal. Raises, in order:
  1. `court_inactive`
  2. `outside_hours`
  3. `misaligned` (minutes since session start aren't a multiple of `slot_minutes`)
  4. `bad_duration` (not a slot multiple, or outside min/max)
  5. when `p_enforce_window` is true: `too_soon` (start < now + min_lead_minutes) and `too_far` (start > now + advance_days)
- **`public.compute_price(p_court_id uuid, p_starts_at timestamptz, p_ends_at timestamptz) returns integer`:**
  - Splits the range into `slot_minutes` segments.
  - Each segment uses the first `court_rates` rule whose `weekdays` contain the segment's local calendar weekday and whose `[starts_at, ends_at)` contains its local start time. If no rule matches, it uses `base_rate_centavos`.
  - Each segment costs `round(rate * slot_minutes / 60.0)`.
- **`public.quote_booking(p_court_id uuid, p_starts_at timestamptz, p_minutes integer) returns integer`:** granted to anon and authenticated. Requires an active venue, runs `validate_booking_range(..., false)`, then returns `compute_price`.
- **`public.get_availability(p_venue_id uuid, p_date date) returns table(court_id uuid, court_name text, sport_slug text, session tstzrange, busy jsonb)`:**
  - Returns rows only for active venues, or when the caller is a venue member or admin.
  - `busy` is a list of `{starts_at, ends_at, state}` for blocking bookings that overlap the session. `state` is `blocked` (kind block), `held` (held or pending_verification) or `booked` (confirmed or checked_in).
  - No personal fields.
- **`public.expire_stale_holds(p_court_id uuid default null) returns integer`:** sets `held` bookings to `expired` where `hold_expires_at <= now()`.
- **`public.create_booking(p_court_id uuid, p_starts_at timestamptz, p_minutes integer) returns public.bookings`.** Checks, in order:
  1. `not_authenticated`
  2. `phone_required` (the profile has no phone)
  3. `venue_not_bookable` (the venue isn't active, or not `venue_has_pro`)
  4. `validate_booking_range(..., true)`
  5. An identical player + court + range with a blocking status → return that row
  6. `hold_limit` (2 or more `held` bookings)
  7. `rate_limited` (10 or more bookings by this player with `created_at > now() - 1 hour`)
  8. `expire_stale_holds(court)`
  9. Insert:
     - `gcash_proof` → status `held` with `hold_expires_at = now() + hold_minutes`
     - `at_venue` → `confirmed`
     - `payment_status` is `unpaid`, and the price comes from `compute_price`
  10. An exclusion violation is raised as `slot_taken`.
  11. `notify_venue(venue, 'manager', 'booking_created', {booking_id, code})`.

- [ ] **Step 1: Write the failing pgTAP test** `050_booking_engine.test.sql`.

  Fixtures (as postgres). `:d2` is the Manila date two days from now. In the assertions below, `L(d, 'HH:MI')` is shorthand: write it as `tests.manila(d, 'HH:MI')`.

  | Fixture | Settings |
  |---|---|
  | venue `v` | `gcash_proof`, slot 60, open daily 06:00–00:00, trial active; court `c` base 40000, rule every day 18:00–22:00 at 60000 |
  | venue `h` | `at_venue`, slot 30, open 06:00–23:00, trial active; court `c30` with the same rates |
  | venue `n` | open daily 16:00–02:00, trial active; court `cn` |
  | venue `v24` | open 00:00–00:00 (24 h), `min_lead_minutes` 120; court `c24` |
  | venue `f` | free (no trial); court `cf` |
  | `:fri`, `:sat` | a Friday more than a week ahead and the Saturday after it |

  Players: `p1` and `p2` have phones, `p3` doesn't.
```sql
select is(public.compute_price(:'c', L(:'d2','17:00'), L(:'d2','19:00')), 100000, 'price crosses into peak at 18:00');
select is(public.quote_booking(:'c30', L(:'d2','17:30'), 60), 50000, '30-minute slots price each half hour');
select is(public.is_within_hours(:'n', L(:'fri','23:00'), L(:'sat','01:00')), true, 'session runs past midnight');
select is(public.is_within_hours(:'n', L(:'sat','01:00'), L(:'sat','03:00')), false, 'not past closing');
select tests.authenticate_as(:'p1');
select id as b1 from public.create_booking(:'c', L(:'d2','10:00'), 60) \gset
select ok((select status = 'held' and hold_expires_at between now() + interval '29 min' and now() + interval '31 min' and price_total_centavos = 40000 from public.bookings where id = :'b1'), 'gcash venue creates a 30-minute hold');
select is((select id from public.create_booking(:'c', L(:'d2','10:00'), 60)), :'b1'::uuid, 'double tap returns the same booking');
select is((select status::text from public.create_booking(:'c30', L(:'d2','10:00'), 60)), 'confirmed', 'pay-at-venue confirms immediately');
select throws_ok(format($$ select public.create_booking(%L, %L, 60) $$, :'c', L(:'d2','10:30')), 'P0001', 'misaligned', 'start must sit on the slot grid');
select throws_ok(format($$ select public.create_booking(%L, %L, 60) $$, :'c', L(:'d2','05:00')), 'P0001', 'outside_hours', 'closed hours are refused');
select throws_ok(format($$ select public.create_booking(%L, %L, 60) $$, :'c24', date_trunc('hour', now()) + interval '1 hour'), 'P0001', 'too_soon', 'lead time enforced');
select throws_ok(format($$ select public.create_booking(%L, %L, 60) $$, :'c', L(:'d2','10:00') + interval '20 days'), 'P0001', 'too_far', 'advance window enforced');
select throws_ok(format($$ select public.create_booking(%L, %L, 30) $$, :'c', L(:'d2','12:00')), 'P0001', 'bad_duration', 'duration bounds enforced');
select throws_ok(format($$ select public.create_booking(%L, %L, 60) $$, :'cf', L(:'d2','10:00')), 'P0001', 'venue_not_bookable', 'free venues take no online bookings');
select lives_ok(format($$ select public.create_booking(%L, %L, 60) $$, :'c', L(:'d2','11:00')), 'second hold allowed');
select throws_ok(format($$ select public.create_booking(%L, %L, 60) $$, :'c', L(:'d2','12:00')), 'P0001', 'hold_limit', 'third hold refused');
select tests.authenticate_as(:'p3');
select throws_ok(format($$ select public.create_booking(%L, %L, 60) $$, :'c', L(:'d2','13:00')), 'P0001', 'phone_required', 'contact phone required');
select tests.authenticate_as(:'p2');
select throws_ok(format($$ select public.create_booking(%L, %L, 60) $$, :'c', L(:'d2','10:00')), 'P0001', 'slot_taken', 'overlap reported as slot_taken');
select tests.as_postgres();
update public.bookings set hold_expires_at = now() - interval '1 minute' where id = :'b1';
select tests.authenticate_as(:'p2');
select lives_ok(format($$ select public.create_booking(%L, %L, 60) $$, :'c', L(:'d2','10:00')), 'an expired hold frees the slot');
select tests.as_postgres();
select is((select status::text from public.bookings where id = :'b1'), 'expired', 'the stale hold is marked expired');
-- rate limit: insert 10 cancelled bookings for p2 with created_at = now() (as postgres), then:
select tests.authenticate_as(:'p2');
select throws_ok(format($$ select public.create_booking(%L, %L, 60) $$, :'c', L(:'d2','15:00')), 'P0001', 'rate_limited', 'ten bookings an hour max');
select tests.authenticate_as_anon();
select ok(exists(select 1 from public.get_availability(:'v', :'d2') g, jsonb_array_elements(g.busy) b where g.court_id = :'c' and b->>'state' = 'held'), 'holds show as held');
select is((select count(*)::int from public.get_availability(:'v', :'d2') g, jsonb_array_elements(g.busy) b where b ? 'player_id' or b ? 'customer_name'), 0, 'availability carries no personal data');
select is((select count(*)::int from public.get_availability(:'f_draft', :'d2')), 0, 'draft venues expose no availability');
-- Review Focus 1: as postgres insert a confirmed booking on cn at [L(:'sat','00:00'), L(:'sat','01:00'))
select ok(exists(select 1 from public.get_availability(:'n', :'fri') g, jsonb_array_elements(g.busy) b where (b->>'starts_at')::timestamptz = L(:'sat','00:00')), 'Saturday 00:00 belongs to Friday''s session');
select ok(not exists(select 1 from public.get_availability(:'n', :'sat') g, jsonb_array_elements(g.busy) b where (b->>'starts_at')::timestamptz = L(:'sat','00:00')), '...not Saturday''s');
```
- [ ] **Step 2: Write the failing race test** `tests/integration/booking-race.test.ts`.
  - **Setup:** the admin client (secret key) creates an active venue (`gcash_proof`, trial active, open 00:00–00:00) with one court, plus two confirmed users with phones. It signs both users in with passwords.
  - **Cleanup:** `afterAll` deletes the users and the venue, and runs even when the test fails.
```ts
it('two players racing for one slot: exactly one wins', async () => {
  const args = { p_court_id: courtId, p_starts_at: slotStartIso, p_minutes: 60 }; // 3 days ahead, 10:00 Manila
  const [a, b] = await Promise.all([playerA.rpc('create_booking', args), playerB.rpc('create_booking', args)]);
  expect([a, b].filter((r) => !r.error)).toHaveLength(1);
  expect([a, b].filter((r) => r.error?.message === 'slot_taken')).toHaveLength(1);
});
```
- [ ] **Step 3: Run** `npm run db:test`. Expected: FAIL (functions missing).
- [ ] **Step 4: Write the migration.**
- [ ] **Step 5: Run** `npm run db:reset && npm run db:test && npm run test:integration`. Expected: PASS.
- [ ] **Step 6: Propose commit** `feat(db): pricing, availability and race-safe create_booking`

### Task 10: Booking transitions

**Files:** Create migration `<ts>_booking_transitions.sql` and test `supabase/tests/060_booking_transitions.test.sql`.

**Interfaces:** Every function is definer and `returns public.bookings`. A booking in the wrong status raises `invalid_state`.

| Function | Who can call it | What it does |
|---|---|---|
| `submit_booking_payment(p_booking_id uuid, p_reference_no text, p_proof_path text)` | the booker (otherwise `forbidden`) | Requires status `held`. Raises `hold_expired` when `hold_expires_at <= now()`, `reference_required` when the reference is blank, and `bad_proof_path` unless the path matches `^{uid}/{booking_id}/[^/]+\.webp$`. Inserts a `booking_payments` row (submitted, with the amount = the booking price), moves the booking to `pending_verification` and `proof_submitted`, clears `hold_expires_at`, and notifies managers `booking_proof_submitted`. |
| `verify_booking_payment(p_payment_id uuid)` | manager+ of the booking's venue | The payment must be `submitted` and the booking `pending_verification`. Marks the payment verified (reviewer and time), moves the booking to `confirmed` and `paid`, and notifies the player `booking_confirmed`. |
| `reject_booking_payment(p_payment_id uuid, p_reason text)` | manager+ | A blank reason raises `reason_required`. Marks the payment rejected and the booking `cancelled` with `cancel_reason = 'Payment not verified: ' || reason`. Notifies the player `booking_payment_rejected`. |
| `cancel_booking(p_booking_id uuid, p_reason text default null)` | the booker, or manager+ | The booker can cancel `held` or `pending_verification` any time before start, and `confirmed` only until `lower(during) - cancel_cutoff_hours` (`cancel_cutoff` after that). Manager+ can cancel `held`, `pending_verification` or `confirmed` with a non-blank reason. Sets `cancelled`, `cancelled_at` and `cancel_reason`. A `paid` booking moves to `refund_due`. Notifies the other side `booking_cancelled`. |
| `check_in_booking(p_venue_id uuid, p_code text, p_mark_paid boolean default false)` | staff+ of `p_venue_id` | The code is upper-cased and stripped of non-alphanumerics; an unknown code raises `not_found`. Requires `confirmed`. `now()` must fall within `[lower(during) - 2 h, upper(during))`, otherwise `check_in_window`. Sets `checked_in` plus `checked_in_at` and `checked_in_by`, and `paid` when asked. No Pro check. |
| `mark_booking_paid(p_booking_id uuid)` | staff+ | `unpaid` → `paid`. |
| `mark_no_show(p_booking_id uuid)` | staff+ | Requires `confirmed` and `now() >= lower(during) + 15 min`. |
| `mark_refunded(p_booking_id uuid)` | manager+ | `refund_due` → `refunded`. |
| `create_walk_in(p_court_id uuid, p_starts_at timestamptz, p_minutes integer, p_customer_name text, p_customer_phone text default null, p_paid boolean default true)` | staff+ | Requires `venue_has_pro` (otherwise `venue_not_bookable`). Runs `validate_booking_range(..., false)`. Creates kind `walk_in`, status `confirmed`, mode `at_venue`, `paid` or `unpaid`, priced by `compute_price`. An overlap raises `slot_taken`. |
| `create_block(p_court_id uuid, p_starts_at timestamptz, p_ends_at timestamptz, p_note text)` | manager+ | Requires Pro. The start and end must be aligned to the slot grid. Creates kind `block`, status `confirmed`, payment `waived`, price 0. An overlap raises `slot_taken`. |

- [ ] **Step 1: Write the failing test** `060_booking_transitions.test.sql`.

  Fixtures, inserted directly as postgres:

  | Fixture | Setup |
  |---|---|
  | venue `v` | `gcash_proof`, Pro, open 24 h; court `c`; manager `m`, staff `s`; players `p1`, `p2` |
  | `bh`, `bh2`, `bh3` | `held` bookings for `p1` on separate future slots |
  | `bc` | `confirmed`, starts in 48 h |
  | `bc_late` | `confirmed`, starts in 6 h |
  | `bpaid` | `confirmed` + `paid` |
  | `bt` | `confirmed`, starts in 30 min |
  | `bfar` | `confirmed`, starts in 2 days |
  | lapsed venue `l` | `pro_until` 20 days ago; staff `sl`; booking `bl` `confirmed`, starting in 30 min |

  Capture these with `\gset`:
  - each booking's code as `<name>_code`, and `bh2`'s start as `bh2_start`
  - `cl`: the court at `l`
  - `walkin_start`, plus `blk_start` / `blk_end`: free, slot-aligned ranges at `v`

```sql
select tests.authenticate_as(:'p2');
select throws_ok(format($$ select public.submit_booking_payment(%L, 'REF123', 'x.webp') $$, :'bh'), 'P0001', 'forbidden', 'only the booker submits proof');
select tests.authenticate_as(:'p1');
select throws_ok(format($$ select public.submit_booking_payment(%L, 'REF123', 'someone/else.webp') $$, :'bh'), 'P0001', 'bad_proof_path', 'proof must live in the booker''s folder');
select throws_ok(format($$ select public.submit_booking_payment(%L, '  ', %L) $$, :'bh', :'p1' || '/' || :'bh' || '/proof.webp'), 'P0001', 'reference_required', 'reference number required');
select is((select status::text from public.submit_booking_payment(:'bh', 'REF123', :'p1' || '/' || :'bh' || '/proof.webp')), 'pending_verification', 'proof moves the booking to verifying');
select tests.as_postgres();
select id as pay from public.booking_payments where booking_id = :'bh' \gset
select tests.authenticate_as(:'s');
select throws_ok(format($$ select public.verify_booking_payment(%L) $$, :'pay'), 'P0001', 'forbidden', 'staff cannot verify payments');
select tests.authenticate_as(:'m');
select is((select status::text || '/' || payment_status::text from public.verify_booking_payment(:'pay')), 'confirmed/paid', 'manager verification confirms and marks paid');
select throws_ok(format($$ select public.verify_booking_payment(%L) $$, :'pay'), 'P0001', 'invalid_state', 'a proof is reviewed once');
select is((select count(*)::int from public.booking_events where booking_id = :'bh' and to_status = 'confirmed'), 1, 'no duplicate confirm event');
select is((select actor_id from public.booking_events where booking_id = :'bh' and to_status = 'confirmed'), :'m'::uuid, 'events record who acted');
-- p1 submits proof for bh3 → payment :pay3, then:
select tests.authenticate_as(:'m');
select throws_ok(format($$ select public.reject_booking_payment(%L, '  ') $$, :'pay3'), 'P0001', 'reason_required', 'rejection needs a reason');
-- Review Focus 3
select tests.as_postgres();
update public.bookings set hold_expires_at = now() - interval '1 minute' where id = :'bh2';
select tests.authenticate_as(:'p1');
select throws_ok(format($$ select public.submit_booking_payment(%L, 'REF9', %L) $$, :'bh2', :'p1' || '/' || :'bh2' || '/p.webp'), 'P0001', 'hold_expired', 'proof after the hold window is refused');
select tests.authenticate_as(:'p2');
select lives_ok(format($$ select public.create_booking(%L, %L, 60) $$, :'c', :'bh2_start'), 'the expired slot is bookable again');
select tests.authenticate_as(:'p1');
select lives_ok(format($$ select public.cancel_booking(%L) $$, :'bc'), 'player cancels before cutoff');
select throws_ok(format($$ select public.cancel_booking(%L) $$, :'bc_late'), 'P0001', 'cancel_cutoff', 'player cannot cancel after cutoff');
select tests.authenticate_as(:'m');
select throws_ok(format($$ select public.cancel_booking(%L) $$, :'bc_late'), 'P0001', 'reason_required', 'venue cancellations need a reason');
select is((select payment_status::text from public.cancel_booking(:'bpaid', 'Court maintenance')), 'refund_due', 'cancelling a paid booking flags a refund');
select tests.authenticate_as(:'s');
select is((select status::text from public.check_in_booking(:'v', lower(:'bt_code'))), 'checked_in', 'staff check in by code, case-insensitive');
select throws_ok(format($$ select public.check_in_booking(%L, %L) $$, :'v', :'bfar_code'), 'P0001', 'check_in_window', 'too early to check in');
select is((select kind::text || '/' || payment_status::text from public.create_walk_in(:'c', :'walkin_start', 60, 'Juan')), 'walk_in/paid', 'walk-in recorded as paid');
select throws_ok(format($$ select public.create_block(%L, %L, %L, 'x') $$, :'c', :'blk_start', :'blk_end'), 'P0001', 'forbidden', 'staff cannot block courts');
select tests.authenticate_as(:'m');
select is((select payment_status::text from public.create_block(:'c', :'blk_start', :'blk_end', 'Resurfacing')), 'waived', 'blocks are free and confirmed');
select tests.authenticate_as(:'s');
select throws_ok(format($$ select public.create_walk_in(%L, %L, 60, 'Ana') $$, :'c', :'blk_start'), 'P0001', 'slot_taken', 'walk-ins cannot overlap a block');
select tests.authenticate_as(:'sl');
select is((select status::text from public.check_in_booking(:'l', :'bl_code')), 'checked_in', 'lapsed venues still check in existing bookings');
select throws_ok(format($$ select public.create_walk_in(%L, %L, 60, 'Ana') $$, :'cl', :'walkin_start'), 'P0001', 'venue_not_bookable', 'lapsed venues cannot add walk-ins');
```
- [ ] **Step 2: Run** `npm run db:test`. Expected: FAIL.
- [ ] **Step 3: Write the migration.**
- [ ] **Step 4: Run** `npm run db:reset && npm run db:test`. Expected: PASS.
- [ ] **Step 5: Propose commit** `feat(db): booking state transitions, walk-ins and blocks`

### Task 11: Venue lifecycle and Pro billing RPCs

**Files:** Create migration `<ts>_lifecycle_billing.sql` and test `supabase/tests/070_lifecycle_billing.test.sql`.

**Interfaces:**
- **Enum:** `billing_period` (`monthly`, `yearly`).
- **`subscription_payments`:** id, venue_id, period, amount_centavos, reference_no, proof_path, `status proof_status` (default `submitted`), submitted_by, submitted_at, reviewed_by, reviewed_at, reason, period_start, period_end.
  - RLS select: `has_venue_role(venue_id,'owner') or is_platform_admin()`.
  - No client writes.
  - Attach the `audit_row` trigger.
- **RPCs** (all definer):

  | RPC | Who | Behaviour |
  |---|---|---|
  | `submit_venue_for_review(p_venue_id uuid) returns public.venues` | owner | From `draft` or `rejected`. Missing items raise `venue_incomplete` with `detail` = a comma-separated list, in this order: `location`, `contact` (phone or messenger_url), `courts` (≥1 active), `hours` (≥1 open day), `photos` (≥1). Moves to `pending_review`, sets `submitted_at`, and notifies admins `venue_submitted`. |
  | `approve_venue(p_venue_id uuid) returns public.venues` | admin | From `pending_review` to `active`. Sets `approved_at = now()`, `trial_ends_at = coalesce(trial_ends_at, now() + trial_days)`, `review_note = null`. Notifies owners `venue_approved`. |
  | `reject_venue(p_venue_id uuid, p_reason text) returns public.venues` | admin | From `pending_review` to `rejected`. The reason is required and goes into `review_note`. Notifies owners `venue_rejected`. |
  | `suspend_venue(p_venue_id uuid, p_reason text)` | admin | `active` → `suspended`. The reason is required. Notifies owners `venue_suspended`. |
  | `reinstate_venue(p_venue_id uuid)` | admin | `suspended` → `active`. The trial is untouched. |
  | `submit_subscription_payment(p_venue_id uuid, p_period billing_period, p_reference_no text, p_proof_path text) returns public.subscription_payments` | owner | The venue must be `active`. The path must match `^{venue_id}/[^/]+\.webp$`. The amount comes from `platform_settings`. Notifies admins `subscription_submitted`. |
  | `verify_subscription_payment(p_payment_id uuid) returns public.venues` | admin | The payment must be `submitted`. `period_start = greatest(now(), pro_until, trial_ends_at)` (nulls skipped), `period_end = period_start + interval '1 month'` or `'1 year'`, and the venue's `pro_until = period_end`. Notifies owners `subscription_verified`. |
  | `reject_subscription_payment(p_payment_id uuid, p_reason text)` | admin | The reason is required. Notifies owners `subscription_rejected`. |
  | `admin_set_pro_until(p_venue_id uuid, p_pro_until timestamptz) returns public.venues` | admin | Sets `pro_until` directly. |

- [ ] **Step 1: Write the failing test** `070_lifecycle_billing.test.sql`.

  Fixtures: owner `o` with a bare draft venue `d`, a manager `m` on `d`, and an admin `a`.
```sql
select tests.authenticate_as(:'o');
select throws_ok(format($$ select public.submit_venue_for_review(%L) $$, :'d'), 'P0001', 'venue_incomplete', 'incomplete venues cannot be submitted');
select is(tests.error_detail(format($$ select public.submit_venue_for_review(%L) $$, :'d')), 'location,contact,courts,hours,photos', 'detail lists what is missing');
-- as postgres, complete d (location, phone, active court, Monday hours, one photo row)
select tests.authenticate_as(:'m');
select throws_ok(format($$ select public.submit_venue_for_review(%L) $$, :'d'), 'P0001', 'forbidden', 'only owners submit for review');
select tests.authenticate_as(:'o');
select is((select status::text from public.submit_venue_for_review(:'d')), 'pending_review', 'complete venues go to review');
select throws_ok(format($$ select public.approve_venue(%L) $$, :'d'), 'P0001', 'forbidden', 'only admins approve');
select tests.authenticate_as(:'a');
select ok((select status = 'active' and trial_ends_at between now() + interval '30 days' - interval '1 minute' and now() + interval '30 days' from public.approve_venue(:'d')), 'approval lists the venue and starts a 30-day trial');
select tests.as_postgres();
select is((select count(*)::int from public.notifications where user_id = :'o' and type = 'venue_approved'), 1, 'owner is notified');
select tests.authenticate_as(:'a');
select lives_ok(format($$ select public.suspend_venue(%L, 'Spam reports') $$, :'d'), 'admin suspends');
select tests.as_postgres();
update public.venues set trial_ends_at = now() - interval '1 day' where id = :'d';
select tests.authenticate_as(:'a');
select lives_ok(format($$ select public.reinstate_venue(%L) $$, :'d'), 'admin reinstates');
select ok((select trial_ends_at < now() from public.venues where id = :'d'), 'reinstating does not restart the trial');
select tests.as_postgres();
update public.venues set trial_ends_at = now() + interval '10 days', pro_until = null where id = :'d';
select tests.authenticate_as(:'o');
select id as sp, amount_centavos as amt from public.submit_subscription_payment(:'d', 'monthly', 'GC-778899', :'d' || '/receipt.webp') \gset
select is(:amt, 99900, 'amount comes from platform settings');
select tests.authenticate_as(:'a');
select ok((select pro_until between now() + interval '10 days' + interval '1 month' - interval '1 minute' and now() + interval '10 days' + interval '1 month' + interval '1 minute' from public.verify_subscription_payment(:'sp')), 'paid month starts after the remaining trial');
select throws_ok(format($$ select public.verify_subscription_payment(%L) $$, :'sp'), 'P0001', 'invalid_state', 'a payment is verified once');
-- owner submits a second payment :sp2, then:
select throws_ok(format($$ select public.reject_subscription_payment(%L, ' ') $$, :'sp2'), 'P0001', 'reason_required', 'rejection needs a reason');
select tests.authenticate_as(:'m');
select throws_ok(format($$ select public.submit_subscription_payment(%L, 'monthly', 'X1', %L) $$, :'d', :'d' || '/r.webp'), 'P0001', 'forbidden', 'only owners pay for Pro');
select is((select count(*)::int from public.subscription_payments where venue_id = :'d'), 0, 'managers cannot see billing');
```
- [ ] **Step 2: Run** `npm run db:test`. Expected: FAIL.
- [ ] **Step 3: Write the migration.**
- [ ] **Step 4: Run** `npm run db:reset && npm run db:test`. Expected: PASS.
- [ ] **Step 5: Propose commit** `feat(db): venue review lifecycle and manual Pro billing`

### Task 12: Search

**Files:** Create migration `<ts>_search.sql` and test `supabase/tests/080_search.test.sql`.

**Interfaces:**
- **Indexes:** GIN on `venues.search`, GIN `gin_trgm_ops` on `venues.name`, GIST on `venues.location`.
- **Signature:**
```
public.search_venues(p_query text default null, p_sport text default null, p_city text default null,
  p_lat double precision default null, p_lng double precision default null, p_radius_km double precision default 25,
  p_max_rate_centavos integer default null, p_indoor boolean default null, p_amenities text[] default null,
  p_bookable_only boolean default false, p_free_at timestamptz default null, p_free_minutes integer default 60,
  p_sort text default 'relevance', p_limit integer default 24, p_offset integer default 0)
returns table(id uuid, slug text, name text, city text, province text, lat double precision, lng double precision,
  sports text[], min_rate_centavos integer, is_bookable boolean, distance_km double precision,
  cover_photo_path text, total_count bigint)
```
- **Rules:**
  - The function is definer, so it can read bookings for `p_free_at`, and it returns public fields only.
  - **Base filter:** only `active` venues.
  - **Sport:** the venue has an active court of that sport, and `min_rate` covers those courts only.
  - **Query:** matches `search @@ websearch_to_tsquery('simple', q)` or `q <% name` (word similarity).
  - **City:** case-insensitive equality.
  - **Radius:** applied only when both lat and lng are given, as `ST_DWithin(location, point, radius_km * 1000)`.
  - **Price and amenities:** `min_rate` is the least of the base rates and rule rates of the matching courts. `p_amenities` means the venue has all of them.
  - **Bookable:** `is_bookable = venue_has_pro(id)`. Setting `p_bookable_only` or `p_free_at` restricts results to bookable venues.
  - **Free at a time:** `p_free_at` needs a matching active court where `is_within_hours` holds for `[free_at, free_at + minutes)` and no blocking booking overlaps.
  - **Sorting:**
    - `distance`: needs coordinates, otherwise falls back to relevance.
    - `price`: `min_rate` ascending.
    - `newest`: `approved_at` descending.
    - `relevance`: `ts_rank + word_similarity` descending, then `approved_at` descending.
  - **Output columns:** `cover_photo_path` is the lowest-sort photo's path, and `total_count = count(*) over ()`.

- [ ] **Step 1: Write the failing test** `080_search.test.sql`.

  Fixtures:

  | Slug | Location | Sport | Tier and rate |
  |---|---|---|---|
  | `t-a` "Terracotta Test Club" | Makati (14.5547, 121.0244) | pickleball | Pro, base 40000, open 24 h |
  | `t-b` | BGC (14.5509, 121.0503) | badminton | free |
  | `t-c` | Cebu (10.3157, 123.8854) | pickleball | Pro |
  | `t-d` | near Makati | – | draft |

  `:t` is a future aligned hour at which `t-a`'s only court is booked.
```sql
select tests.authenticate_as_anon();
select set_eq($$ select slug from public.search_venues(p_sport => 'pickleball') where slug like 't-%' $$, array['t-a','t-c'], 'sport filter');
select set_eq($$ select slug from public.search_venues(p_lat => 14.5547, p_lng => 121.0244, p_radius_km => 10) where slug like 't-%' $$, array['t-a','t-b'], 'radius excludes Cebu and drafts');
select is((select slug from public.search_venues(p_lat => 14.5547, p_lng => 121.0244, p_sort => 'distance') where slug in ('t-a','t-b') limit 1), 't-a', 'nearest first');
select set_eq($$ select slug from public.search_venues(p_bookable_only => true) where slug like 't-%' $$, array['t-a','t-c'], 'bookable filter keeps Pro venues');
select ok(not exists(select 1 from public.search_venues(p_free_at => :'t', p_free_minutes => 60) where slug = 't-a'), 'a fully booked venue is excluded for that time');
select ok(exists(select 1 from public.search_venues(p_free_at => :'t'::timestamptz + interval '2 hours', p_free_minutes => 60) where slug = 't-a'), '...and found when free');
select is((select min_rate_centavos from public.search_venues(p_query => 'terracotta') where slug = 't-a'), 40000, 'min rate reported');
select ok(exists(select 1 from public.search_venues(p_query => 'terracota') where slug = 't-a'), 'typo-tolerant name match');
```
- [ ] **Step 2: Run** `npm run db:test`. Expected: FAIL.
- [ ] **Step 3: Write the migration.**
- [ ] **Step 4: Run** `npm run db:reset && npm run db:test`. Expected: PASS.
- [ ] **Step 5: Propose commit** `feat(db): venue search with distance, availability and fuzzy names`

### Task 13: Storage buckets and policies

**Files:** Create migration `<ts>_storage.sql` and test `supabase/tests/090_storage.test.sql`.

**Interfaces:** Buckets are inserted into `storage.buckets` with these limits, MIME types and path contracts, which M2–M5 depend on:

| Bucket | Public | Limit | Types | Path | Write | Read |
|---|---|---|---|---|---|---|
| venue-photos | yes | 2 MiB | image/webp | `{venue_id}/{photo_id}-{480\|960\|1600}.webp` | manager+ of the venue | public |
| avatars | yes | 1 MiB | image/webp | `{user_id}/{n}.webp` | self | public |
| payment-proofs | no | 2 MiB | image/webp | `{user_id}/{booking_id}/{file}.webp` | the booker of that booking | the booker, manager+ of the booking's venue, admin |
| subscription-proofs | no | 2 MiB | image/webp | `{venue_id}/{file}.webp` | owner | owner, admin |
| payment-qr | no | 1 MiB | image/webp | `venue/{venue_id}.webp`, `platform/payout.webp` | venue: manager+; platform: admin | venue: members, players with a `held` or `pending_verification` booking there, and admin; platform: any authenticated user |
| venue-docs | no | 5 MiB | application/pdf, image/webp | `{venue_id}/{file}` | owner | owner, admin |

Policies use `storage.foldername(name)`. Path segments are regex-checked before any `::uuid` cast, so malformed names fail closed.

- [ ] **Step 1: Write the failing test** `090_storage.test.sql`.

  Fixtures: venue `v` with manager `m` and staff `s`; another venue's manager `m2`; player `p1` with a `held` booking `bh` at `v`; player `p2` with booking `b2`; player `p3` with nothing.
```sql
select tests.authenticate_as(:'m');
select lives_ok(format($$ insert into storage.objects (bucket_id, name) values ('venue-photos', %L) $$, :'v' || '/p1-480.webp'), 'manager uploads venue photos');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('venue-photos', 'not-a-uuid/x.webp') $$, '42501', null, 'malformed paths fail closed');
select tests.authenticate_as(:'s');
select throws_ok(format($$ insert into storage.objects (bucket_id, name) values ('venue-photos', %L) $$, :'v' || '/p2-480.webp'), '42501', null, 'staff cannot upload venue photos');
select tests.authenticate_as(:'m2');
select throws_ok(format($$ insert into storage.objects (bucket_id, name) values ('venue-photos', %L) $$, :'v' || '/p3-480.webp'), '42501', null, 'other venues cannot either');
select tests.authenticate_as(:'p1');
select lives_ok(format($$ insert into storage.objects (bucket_id, name) values ('payment-proofs', %L) $$, :'p1' || '/' || :'bh' || '/proof.webp'), 'booker uploads proof for own booking');
select throws_ok(format($$ insert into storage.objects (bucket_id, name) values ('payment-proofs', %L) $$, :'p1' || '/' || :'b2' || '/x.webp'), '42501', null, 'not for someone else''s booking');
select tests.authenticate_as(:'m');
select is((select count(*)::int from storage.objects where bucket_id = 'payment-proofs' and name like :'p1' || '/%'), 1, 'venue manager sees proofs for their bookings');
select tests.authenticate_as(:'p2');
select is((select count(*)::int from storage.objects where bucket_id = 'payment-proofs' and name like :'p1' || '/%'), 0, 'other players cannot');
select tests.as_postgres();
insert into storage.objects (bucket_id, name) values ('payment-qr', 'venue/' || :'v' || '.webp');
select tests.authenticate_as(:'p1');
select is((select count(*)::int from storage.objects where bucket_id = 'payment-qr' and name = 'venue/' || :'v' || '.webp'), 1, 'players with an active hold read the venue QR');
select tests.authenticate_as(:'p3');
select is((select count(*)::int from storage.objects where bucket_id = 'payment-qr' and name = 'venue/' || :'v' || '.webp'), 0, 'others cannot');
```
- [ ] **Step 2: Run** `npm run db:test`. Expected: FAIL.
- [ ] **Step 3: Write the migration.**
- [ ] **Step 4: Run** `npm run db:reset && npm run db:test`. Expected: PASS.
- [ ] **Step 5: Propose commit** `feat(db): storage buckets with venue- and booking-scoped policies`

### Task 14: Scheduled jobs and realtime

**Files:** Create migration `<ts>_jobs_realtime.sql` and test `supabase/tests/100_jobs_realtime.test.sql`.

**Interfaces:**
- **`public.complete_ended_bookings() returns integer`:** `confirmed` or `checked_in` bookings with `upper(during) <= now()` become `completed`.
- **`public.send_booking_reminders() returns integer`:** for `confirmed` online bookings starting within 2 h with `reminded_at is null`, notify the player `booking_reminder` and set `reminded_at`.
- **`public.send_pro_expiry_reminders() returns integer`:**
  - Applies to active venues whose `greatest(pro_until, trial_ends_at)` falls on the Manila date exactly 7, 3 or 1 days from today.
  - Notifies owners `pro_expiring` with `{venue_id, days_left}`.
  - Skips a venue when a notification with the same payload already exists.
- **Cron jobs** (exact names):

  | Job | Schedule | Runs |
  |---|---|---|
  | `expire-holds` | `* * * * *` | `select public.expire_stale_holds()` |
  | `complete-bookings` | `*/15 * * * *` | `select public.complete_ended_bookings()` |
  | `booking-reminders` | `*/15 * * * *` | `select public.send_booking_reminders()` |
  | `pro-expiry-reminders` | `0 0 * * *` (08:00 Manila) | `select public.send_pro_expiry_reminders()` |

- **Realtime:**
  - `alter publication supabase_realtime add table public.bookings, public.notifications`.
  - The trigger `broadcast_availability()` fires after insert, or after an update of `status` or `during`, on bookings. It calls `realtime.send(jsonb_build_object('court_id', court_id, 'starts_at', lower(during), 'ends_at', upper(during), 'state', s), 'availability', 'availability:' || venue_id, false)`.
  - `s` is `blocked`, `held` or `booked`, or `free` when the new status doesn't block.

- [ ] **Step 1: Write the failing test** `100_jobs_realtime.test.sql`.

  Fixtures, as postgres: venue `v` (Pro); booking `be` `confirmed` and already ended; booking `bn` `no_show` and ended; booking `br` `confirmed` for `p1`, starting in 90 min.
```sql
select is((select count(*)::int from cron.job where jobname in ('expire-holds','complete-bookings','booking-reminders','pro-expiry-reminders')), 4, 'all four jobs are scheduled');
select ok(public.complete_ended_bookings() >= 1, 'ended bookings complete');
select is((select status::text from public.bookings where id = :'be'), 'completed', 'confirmed past end becomes completed');
select is((select status::text from public.bookings where id = :'bn'), 'no_show', 'no-shows stay no-shows');
select ok(public.send_booking_reminders() >= 1, 'upcoming bookings get reminders');
select is(public.send_booking_reminders(), 0, 'reminders are sent once');
update public.venues set pro_until = null, trial_ends_at = (((now() at time zone 'Asia/Manila')::date + 7) + time '12:00') at time zone 'Asia/Manila' where id = :'v';
select ok(public.send_pro_expiry_reminders() >= 1, '7-day expiry reminder sent');
select is(public.send_pro_expiry_reminders(), 0, 'one reminder per milestone');
-- insert a confirmed booking at v
select ok(exists(select 1 from realtime.messages where topic = 'availability:' || :'v' and payload->>'state' = 'booked'), 'availability broadcast emitted');
select ok(not exists(select 1 from realtime.messages where topic = 'availability:' || :'v' and (payload ? 'player_id' or payload ? 'customer_name')), 'broadcast carries no personal data');
```
- [ ] **Step 2: Run** `npm run db:test`. Expected: FAIL.
- [ ] **Step 3: Write the migration.**
- [ ] **Step 4: Run** `npm run db:reset && npm run db:test`. Expected: PASS.
- [ ] **Step 5: Propose commit** `feat(db): cron jobs and availability broadcasts`

### Task 15: Seed data and placeholder photos

**Files:**
- Create: `supabase/seed.sql`, `scripts/seed-photos.ts`, `e2e/support/seed-ids.ts`, and the test `supabase/tests/110_seed.test.sql`
- Install: `npm i sharp`
- Modify `package.json`: `db:reset` becomes `npx supabase db reset && node scripts/seed-photos.ts`. Exclude `scripts/` from `tsconfig.json` (or allow `.ts` imports).

**Interfaces:**
- **IDs:** every seeded entity has a fixed UUID. `e2e/support/seed-ids.ts` mirrors them as `SEED.users.{admin,owner,manager,staff,player}` and `SEED.venues.<camelSlug>`.
- **Users:**
  - The 5 demo users plus `player01…player40@courtify.test`, all with password `courtify-demo` and phones `+63917…`.
  - Insert them into `auth.users` with `extensions.crypt(..., extensions.gen_salt('bf'))`, `email_confirmed_at = now()`, and `''` (not NULL) for `confirmation_token`, `recovery_token`, `email_change_token_new`, `email_change_token_current`, `email_change`, `phone_change`, `phone_change_token` and `reauthentication_token`. GoTrue fails on NULLs in these.
  - Each user also gets a matching `auth.identities` row: provider `email`, `provider_id = user id`, `identity_data {sub, email, email_verified: true}`.
  - `admin@` is added to `platform_admins`.
- **Venues** (fictional):

  | # | Slug | City | Sports | Tier | Payment mode |
  |---|---|---|---|---|---|
  | 1 | `terracotta-rally-club` | Makati | tennis, padel | Pro (+5 mo) | gcash_proof |
  | 2 | `chalkline-pickle-yard` | Taguig | pickleball | trial (+18 d) | at_venue |
  | 3 | `shuttle-and-sol` | Quezon City | badminton | Pro, plus a **submitted** subscription payment | gcash_proof |
  | 4 | `kanto-baseline-courts` | Pasig | badminton, pickleball | free (trial ended) | at_venue |
  | 5 | `arco-padel-terraza` | Muntinlupa | padel | Pro | at_venue |
  | 6 | `loma-clayhouse` | Parañaque | tennis, squash | free | at_venue |
  | 7 | `sugbo-smash-house` | Cebu City | pickleball, badminton | Pro | gcash_proof |
  | 8 | `mactan-breeze-courts` | Lapu-Lapu | tennis | lapsed (`pro_until` −20 d) | at_venue |
  | 9 | `ermita-ping-pong-plaza` | Manila | table-tennis | free | at_venue |
  | 10 | `dink-district-mandaluyong` | Mandaluyong | pickleball | Pro, open until 02:00 | gcash_proof |
  | 11 | `ortigas-squash-box` | Pasig | squash | `pending_review` | – |
  | 12 | `patio-padel-tagaytay` | Tagaytay | padel | `draft` | – |

- **Membership:**
  - `owner@` owns venues 1, 4 and 12. Venue 1 also has `manager@` and `staff@`.
  - The other venues are owned by `player01`–`player08`, standing in as other owners.
- **Each active venue has:**
  - 2–6 courts
  - opening hours, and base rates between 25000 and 150000
  - a weekday 17:00–22:00 peak rule at +20–40%
  - 3–6 amenities and 3–5 `venue_photos` rows
  - payment details (fake GCash name and number) for `gcash_proof` venues
  - one verified subscription payment for Pro venues
- **Bookings:** for Pro and lapsed venues, using `setseed(0.42)`, with `courtify.seeding = 'on'` (so audit is skipped) and prices from `compute_price`:
  - **Past 60 days:** 1-hour slots with peak-weighted occupancy; 85% `completed`, 10% `cancelled`, 5% `no_show`; about 15% walk-ins.
  - **Next 14 days:** mostly `confirmed`. Venue 1 also gets two `pending_verification` bookings, each with a submitted `booking_payments` proof, and one `held` booking.
  - One block per venue.
- **`scripts/seed-photos.ts`:**
  - Reads `.env.local`.
  - For each `venue_photos` row, renders an SVG court scene for the venue's first sport: clay or sand surface, chalk lines from `COURT_SPECS`, a long diagonal sun shadow, and an angle that varies per photo.
  - Uses `sharp` to write WebP at 480, 960 and 1600 px, and uploads `venue-photos/{path}-{w}.webp` with `upsert: true` and `cacheControl: '31536000'`.
  - Exits non-zero on any failure.

- [ ] **Step 1: Write the failing test** `110_seed.test.sql`:
```sql
select is((select count(*)::int from auth.users where email like '%@courtify.test'), 45, '5 demo + 40 extra accounts');
select is((select count(*)::int from public.venues where status = 'active'), 10, 'ten listed venues');
select ok((select bool_and(public.venue_has_pro(id)) from public.venues where slug in ('terracotta-rally-club','chalkline-pickle-yard','shuttle-and-sol','arco-padel-terraza','sugbo-smash-house','dink-district-mandaluyong')), 'Pro and trial venues are bookable');
select ok((select not public.venue_has_pro(id) from public.venues where slug = 'mactan-breeze-courts'), 'lapsed venue is not bookable');
select ok((select count(*) from public.bookings where lower(during) < now() - interval '50 days') > 0, 'history reaches back 60 days');
select is((select count(*)::int from public.subscription_payments where status = 'submitted'), 1, 'one Pro payment waits for admin');
select ok((select count(*) from public.booking_payments where status = 'submitted') >= 2, 'proofs wait for verification');
select is((select count(*)::int from public.venues v where v.status = 'active' and not exists (select 1 from public.venue_photos p where p.venue_id = v.id)), 0, 'every listed venue has photos');
select ok((select count(*) from public.venue_members m join auth.users u on u.id = m.user_id where u.email = 'owner@courtify.test') = 3, 'demo owner runs three venues');
```
- [ ] **Step 2: Run** `npm run db:test`. Expected: FAIL (no seed).
- [ ] **Step 3: Write `seed.sql`, `seed-photos.ts` and `seed-ids.ts`.**
- [ ] **Step 4: Run** `npm run db:reset && npm run db:test`. Expected: PASS, including every earlier file (they're fixture-scoped). Then open `http://127.0.0.1:54323` (Studio) and check that `venue-photos` contains WebP files.
- [ ] **Step 5: Propose commit** `feat(db): realistic fictional seed with generated court photos`

### Task 16: Supabase clients, session helpers, proxy

**Files:**
- Install: `npm i @supabase/ssr server-only zod`
- Create:
  - `src/lib/supabase/{env,client,server,admin,proxy}.ts`
  - `src/lib/supabase/types.ts`, generated with `npm run db:types`
  - `src/lib/auth/redirect.ts` and its test, `src/lib/auth/session.ts`, `src/proxy.ts`
  - migration `<ts>_my_venues.sql` and test `supabase/tests/120_my_venues.test.sql`

**Interfaces:**
- **`public.my_venues() returns table(id uuid, name text, slug text, status venue_status, role member_role, has_pro boolean)`:** invoker. Returns the caller's memberships, ordered by name.
- **Clients:**
  - `createBrowserSupabase(): SupabaseClient<Database>` in `client.ts`.
  - `createServerSupabase(): Promise<SupabaseClient<Database>>` in `server.ts`. It uses `await cookies()` with `getAll` and `setAll`; `setAll` is wrapped in try/catch for Server Components.
  - `createAdminSupabase(): SupabaseClient<Database>` in `admin.ts`, with `import 'server-only'`, the secret key, and `{ auth: { persistSession: false, autoRefreshToken: false } }`.
  - `env.ts` validates with zod: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, plus `SUPABASE_SECRET_KEY` (server only).
- **`updateSession(request: NextRequest): Promise<{ response: NextResponse; userId: string | null }>`** in `supabase/proxy.ts`. It calls `getClaims()` immediately after creating the client.
- **`src/proxy.ts`:** `export async function proxy(request: NextRequest)`.
  - Protected prefixes: `/me`, `/book`, `/owner`, `/admin`. With no user it redirects to `/login?next=<encoded path+search>`.
  - The matcher excludes `_next/static`, `_next/image`, `favicon.ico` and image extensions.
- **`safeNextPath(next: string | null | undefined, fallback = '/'): string`.**
- **`session.ts`** (with `import 'server-only'`):
  - `type Viewer = { id: string; email: string | null; fullName: string; isAdmin: boolean; venues: { id: string; name: string; slug: string; status: string; role: VenueRole; hasPro: boolean }[] }`
  - `getViewer(): Promise<Viewer | null>`, wrapped in React `cache`. It reads claims via `getClaims()`, then fetches the profile, `my_venues()` and `is_platform_admin()` in parallel.
  - `requireViewer(nextPath: string): Promise<Viewer>`: redirects to login when there's no viewer.
  - `requireAdmin(): Promise<Viewer>`: calls `notFound()` for non-admins.
  - `requireVenueRole(venueId: string, min: VenueRole): Promise<{ viewer: Viewer; venue: Viewer['venues'][number] }>`: calls `notFound()` when the caller is below `min`.

- [ ] **Step 1: Write the failing tests.**
```ts
// src/lib/auth/redirect.test.ts
it.each([
  ['/me/bookings?tab=past', '/me/bookings?tab=past'],
  ['//evil.example', '/'],
  ['https://evil.example', '/'],
  ['/\\evil.example', '/'],
  ['javascript:alert(1)', '/'],
  ['me', '/'],
  ['', '/'],
  [null, '/'],
])('safeNextPath(%s) → %s', (input, expected) => expect(safeNextPath(input)).toBe(expected));
```
```sql
-- 120_my_venues.test.sql
-- fixtures: owner of active Pro venue v and draft d; outsider
select tests.authenticate_as(:'owner');
select set_eq($$ select slug || ':' || role || ':' || has_pro from public.my_venues() where slug like 't-%' $$, array['t-v:owner:true','t-d:owner:false'], 'members get their venues with role and Pro flag');
select tests.authenticate_as(:'outsider');
select is((select count(*)::int from public.my_venues() where slug like 't-%'), 0, 'non-members get nothing');
```
- [ ] **Step 2: Run** `npm test` and `npm run db:test`. Expected: FAIL.
- [ ] **Step 3: Implement** the migration, run `npm run db:types`, then write the clients, helpers and proxy.
- [ ] **Step 4: Run** `npm run db:reset && npm run db:test && npm test && npm run build`. Expected: PASS.
- [ ] **Step 5: Propose commit** `feat: Supabase SSR clients, viewer session helpers and proxy`

### Task 17: Auth flows

**Files:**
- Create:
  - `src/app/(auth)/layout.tsx` and the pages `(auth)/{login,signup,forgot-password,reset-password}/page.tsx`
  - `src/app/auth/callback/route.ts`
  - `src/features/auth/{schemas.ts,actions.ts,password-field.tsx,demo-logins.tsx,login-form.tsx,signup-form.tsx,forgot-form.tsx,reset-form.tsx}`
  - `src/lib/flash.ts`, `src/components/shell/flash-toast.tsx`
  - `e2e/support/{global-setup.ts,mail.ts,auth.ts}`, `e2e/auth.spec.ts`
- Modify: `playwright.config.ts` (`globalSetup`), and `src/app/layout.tsx` (add `<FlashToast />`)

**Interfaces:**
- **zod schemas:**
  - `signInSchema`: email, plus a password of at least 1 character.
  - `signUpSchema`:
    - `fullName`: 2–80 characters.
    - `email`.
    - `password`: at least 8 characters.
    - `consent`: `z.literal(true)` with the message 'Please accept the Terms and Privacy Policy to continue.'.
  - `forgotSchema`: email.
  - `resetSchema`: password (at least 8) and `confirm`, refined to be equal with the message 'Passwords don’t match.'.
- **Server actions:** each has the shape `(prev: FormState, formData: FormData) => Promise<FormState>`, with `type FormState = { ok: boolean; message?: string; fieldErrors?: Record<string, string[]> }`.

  | Action | On success | On failure |
  |---|---|---|
  | `signIn` | `setFlash('Signed in')`, then `redirect(safeNextPath(next, '/me/bookings'))` | bad credentials: 'Email or password is incorrect.'; unconfirmed: 'Confirm your email first — we sent you a link.' |
  | `signUp` | `auth.signUp` with `options.data.full_name` and `emailRedirectTo: ${SITE_URL}/auth/callback?next=/me/bookings`, then `{ ok: true, message: 'Check your email to confirm your account.' }` | |
  | `requestPasswordReset` | always returns `{ ok: true, message: 'If that email has an account, a reset link is on its way.' }` (redirect target `${SITE_URL}/auth/callback?next=/reset-password`) | |
  | `resetPassword` | `updateUser({ password })`, flash 'Password updated', redirect to `/me/bookings` | with no session, redirect to `/forgot-password` |
  | `signOut` | flash 'Signed out', redirect to `/` | |

  `SITE_URL` is `NEXT_PUBLIC_SITE_URL`.
- **`GET /auth/callback?code&next`:** calls `exchangeCodeForSession`, then redirects to `safeNextPath(next, '/me/bookings')`. On failure it redirects to `/login?error=link_expired`, and the login page shows 'That link expired or was already used. Try again.'.
- **Flash:**
  - `setFlash(message: string, kind: 'success' | 'error' | 'info' = 'success'): Promise<void>` sets the cookie `courtify_flash`: max-age 60, path `/`, not httpOnly, `sameSite` lax.
  - `<FlashToast />` (client) reads and deletes that cookie on mount and whenever `usePathname` changes, then calls `toast[kind]`.
- **`<PasswordField name label autoComplete />`:** each instance has its own toggle with `aria-pressed`, labelled 'Show password' or 'Hide password'.
- **`<DemoLogins />`:** returns null unless `process.env.NODE_ENV === 'development'`. It shows one button per demo role, and each submits that role's credentials.
- **`e2e/support/global-setup.ts`:** throws "Local Supabase isn't running — run npm run db:start" unless `GET {NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health` returns 200.
- **`e2e/support/mail.ts`:** `latestAuthLink(to: string): Promise<string>`.
  - It polls Mailpit at `http://127.0.0.1:54324` for up to 10 s: `GET /api/v1/search?query=to:"<to>"`, takes the newest ID, then `GET /api/v1/message/{ID}`.
  - It returns the first link containing `/auth/v1/verify`.
  - If `npx supabase status` reports a different mail UI, use that.
- **`e2e/support/auth.ts`:** `signInAs(page, role: 'admin'|'owner'|'manager'|'staff'|'player')` signs in through the login form.

- [ ] **Step 1: Write the failing tests** `e2e/auth.spec.ts`:
```ts
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
  const email = `e2e-${Date.now()}@courtify.test`;
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
  // sign up and confirm a fresh user via the helper above, sign out, then:
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
```
- [ ] **Step 2: Run** `npm run test:e2e -- e2e/auth.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the pages, actions, callback, flash and helpers.
- [ ] **Step 4: Run** `npm run test:e2e`. Expected: PASS on both projects.
- [ ] **Step 5: Propose commit** `feat: email auth with consent, reset, flash toasts and dev-only demo logins`

### Task 18: Role shells and navigation

Before starting, load the `vercel:next-cache-components` skill: every session read under `cacheComponents` must sit inside `<Suspense>`.

**Files:**
- Create:
  - `src/components/shell/{auth-slot,user-menu,app-sidebar,mobile-tab-bar}.tsx`
  - `src/features/owner/nav.ts` and its test, `src/features/admin/nav.ts`
  - `src/app/(player)/{layout,error}.tsx` and the pages `(player)/me/{bookings,favorites,profile,notifications}/page.tsx`
  - `src/app/owner/{layout,page,error}.tsx`, `owner/new/page.tsx`, `owner/[venueId]/layout.tsx`, `owner/[venueId]/[section]/page.tsx`
  - `src/app/admin/{layout,page,error}.tsx`, `admin/[section]/page.tsx`
  - `e2e/shells.spec.ts`
- Modify: the layouts that render `SiteHeader`, so they pass `authSlot={<Suspense fallback={<DelayedSkeleton lines={1} />}><AuthSlot /></Suspense>}`

**Interfaces:**
- **Owner sections:** `OWNER_SECTIONS: readonly OwnerSection[]`, where:
  - `slug`: one of 'today', 'calendar', 'bookings', 'check-in', 'payments', 'courts', 'pricing', 'hours', 'profile', 'analytics', 'activity', 'team', 'billing', 'settings'
  - `label: string`
  - `group`: 'Operate', 'Setup', 'Insights' or 'Account'
  - `icon: LucideIcon`
  - `minRole: VenueRole`
  - `proOnly: boolean`
  - `mobilePrimary?: boolean`

  | Sections | minRole | proOnly | Mobile primary |
  |---|---|---|---|
  | today, calendar, bookings, check-in | staff | no | today, calendar, check-in |
  | payments | manager | no | yes |
  | courts, pricing, hours, profile | staff | no | no |
  | analytics, activity | manager | yes | no |
  | team | owner | yes | no |
  | billing, settings | owner | no | no |

  Staff see the Setup screens read-only; that behaviour is built in M3.
- **`ownerNavFor(role: VenueRole, hasPro: boolean): { section: OwnerSection; locked: boolean }[]`:** keeps the sections at or below `role`, with `locked = proOnly && !hasPro`.
- **`ADMIN_SECTIONS`:** `approvals`, `subscriptions`, `venues`, `users`, `bookings`, `catalog`, `audit`, `settings`. The overview lives at `/admin`.
- **`<AppSidebar label shell: 'owner' | 'admin' header? groups />`:**
  - `groups`: `{ title, items: { href, label, icon, locked?, badge?, current }[] }[]`.
  - Renders `<nav aria-label={label}>` inside a root with `data-shell={shell}`.
  - A locked item shows a Lock icon and the printed word "Pro". `current` sets `aria-current="page"`.
- **`<MobileTabBar label items />`:** `md:hidden`, fixed to the bottom, with the centre item emphasised.
- **`<AuthSlot />`:** shows a Sign in link, or `<UserMenu viewer />`. The menu has My bookings, Saved, Profile, "Venue dashboard" (venue members) or "List your venue" (everyone else), "Admin" (admins only), and Sign out.
- **Player layout:** `requireViewer(path)`, plus SiteHeader with the auth slot and `MobileTabBar`: Explore → `/courts`, Bookings → `/me/bookings`, Saved → `/me/favorites`, Profile → `/me/profile`.
- **`/owner`:**
  - 0 venues: a "List your venue" call to action linking to `/owner/new` (a placeholder).
  - 1 venue: redirect to `/owner/{id}/today`.
  - More: venue cards.
- **`/owner/[venueId]` layout:** `requireVenueRole(venueId, 'staff')`, the sidebar with a venue switcher (`viewer.venues`), and the mobile tab bar plus a "More" sheet.
- **`[section]` pages:**
  - The slug must be in the list and allowed for the role, otherwise `notFound()`.
  - The page renders `EmptyState` ("{Label} arrives in M3" or "M5") with `metadata.title = Label`.
- **Admin layout:** `requireAdmin()`. The badges are the counts of `pending_review` venues and `submitted` subscription payments.

- [ ] **Step 1: Write the failing tests.**
```ts
// src/features/owner/nav.test.ts
const slugs = (r: VenueRole, pro: boolean) => ownerNavFor(r, pro).map((i) => i.section.slug);
expect(slugs('staff', true)).toEqual(expect.not.arrayContaining(['payments', 'analytics', 'activity', 'team', 'billing', 'settings']));
expect(slugs('manager', true)).toEqual(expect.not.arrayContaining(['team', 'billing', 'settings']));
expect(slugs('owner', true)).toHaveLength(14);
expect(ownerNavFor('owner', false).filter((i) => i.locked).map((i) => i.section.slug)).toEqual(['analytics', 'activity', 'team']);
```
```ts
// e2e/shells.spec.ts
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
  const nav = page.getByRole('navigation', { name: 'Venue' });
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
  await expect(page.getByRole('navigation', { name: 'Venue' }).getByRole('link', { name: /Analytics.*Pro/ })).toBeVisible();
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
  await page.getByRole('navigation', { name: 'Venue' }).getByRole('link', { name: 'Calendar' }).click();
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
```
- [ ] **Step 2: Run** `npm test` and `npm run test:e2e -- e2e/shells.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the shells, the nav config and the placeholder pages.
- [ ] **Step 4: Run the full gate:** `npm run lint && npm test && npm run db:reset && npm run db:test && npm run test:integration && npm run test:e2e`. Expected: all PASS.
- [ ] **Step 5: Propose commit** `feat: player, owner and admin shells with role-aware navigation`
