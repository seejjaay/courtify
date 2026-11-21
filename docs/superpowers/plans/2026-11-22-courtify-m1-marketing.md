# Courtify M1: Landing, For venues and Legal: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the public face of Courtify:
- the "two sides of the net" landing page (players and venue owners, with owners weighted more)
- the long `/for-venues` owner page
- real Terms and Privacy drafts

All of it fast and smooth on budget Android phones.

**Architecture:**
- The landing is static Server Components composed from `src/features/marketing/*`.
- Public data (Pro prices, sports, real stats) comes from `'use cache'` readers over a cookie-free Supabase client.
- The hero intro motion is pure CSS, so it runs before any JS.
- GSAP plus ScrollTrigger drives the below-the-fold scenes and the sports morph. It's dynamically imported after LCP, through one client boot component.
- Reduced motion means every section shows its finished state from the same markup.

**Tech Stack:** Next 16.4 (App Router, Cache Components, typed routes), React 19.3, Tailwind 4.3, supabase-js, GSAP 3 (+ ScrollTrigger, free), Playwright 1.65, Vitest 5.

**Spec:** `docs/superpowers/specs/2026-11-22-courtify-m1-marketing-design.md` (M1 design), on top of `docs/superpowers/specs/2026-11-21-courtify-design.md` (main spec).

## Global Constraints
- **Performance budget:**
  - LCP < 2.5 s and CLS < 0.05 with mid-tier mobile throttling (4× CPU).
  - Initial JS for `/` around 150 KB gzipped or less.
  - `gsap` is never in the initial chunks of any route.
- **Motion:**
  - Animate only `transform` and `opacity` (SVG `stroke-dashoffset` for chalk lines and GSAP `attr` tweens for the court morph are the only exceptions).
  - Never drive animation from React state.
  - Cursor effects only under `(pointer: fine)`.
  - Loops pause offscreen and while `document.hidden`.
  - `prefers-reduced-motion: reduce` means no animation, finished state, same markup.
- **Type and colour:**
  - Fugaz One (`font-display`) is display-only, never below 20px. Work Sans for everything else.
  - Text on clay is always ink.
  - Every text/background pair ≥ 4.5:1, enforced by the M0 contrast test (`src/lib/design/contrast.test.ts`). Add any new pair there.
- **Headings and keyboard:** exactly one `h1` per page, and everything works by keyboard.
- **Links:**
  - The player search submits `GET /courts?sport=<slug>&city=<text>&date=<YYYY-MM-DD>`, omitting empty fields.
  - Owner calls to action link to `/owner/new`.
- **Copy:**
  - Plain, warm English with local specifics (₱, GCash, Messenger).
  - No invented stats, testimonials or partner logos.
  - Illustrative numbers live only inside elements labelled "Product preview".
- **Money:** always from `platform_settings` via `formatPHP(centavos)` (`src/lib/money.ts`). Never hard-code ₱999 or ₱9,990 in UI code.
- **Imagery:** Courtify's own art only (`CourtDiagram`, `ArchFrame`, generated court scenes). No stock photos, no external image hosts.
- **Commits:** M1 runs on branch `m1-marketing`, with a commit after each green task and no push (CJ's standing M1 approval).

## Review Focus
1. **JS blocked or very slow** (FB/Messenger in-app browser, 3G). Every section is readable, and both calls to action work with JavaScript disabled: the search is a plain GET form and the links are plain anchors. → Task 10, `landing works without JavaScript`.
2. **Reduced motion.** No element animates, and every section is in its finished state. → Task 10, `reduced motion shows the finished page`.
3. **320 px phones** (small Androids). There's no horizontal scroll, and both hero doors are visible above the fold. → Task 2, `fits a 320px phone`.
4. **Odd `platform_settings` values.** Yearly ≥ 12× monthly shows no saving line; `trial_days = 0` drops the trial wording; `grace_days = 0` drops the grace wording. → Task 1 unit tests.
5. **Keyboard on the sports switcher.** Arrow keys move between the six tabs, Home and End jump to the ends, and selecting stops auto-advance. → Task 4 unit tests.

## Plan-level calls (beyond the design; flag if wrong)
- **The hero intro is CSS keyframes, not GSAP.** That means the chalk-in (`stroke-dashoffset`), the ball rally (`transform`) and the headline bounce. It starts with the first paint, costs 0 KB of JS, and switches off under reduced motion through `@media`. GSAP stays below the fold, where loading late can't flash anything.
- **Below-the-fold scenes are finished in the HTML.** The motion module sets "from" states only for sections that are still below the viewport when it boots.
- **The hero date field is empty in the HTML.** A client effect fills today's Manila date after mount, because a server-computed "today" would freeze in the static shell.
- **The stats band shows only at ≥ 10 active venues and ≥ 3 cities**, otherwise it renders nothing.
- **The settings cache** uses `cacheLife('hours')` and `cacheTag('platform-settings')`.
- **The FAQ** uses native `<details>`/`<summary>`.
- **The landing OG image** is `src/app/(marketing)/opengraph-image.tsx` via `next/og`, static at build.
- **The performance gate is a Playwright spec** using Chromium CDP: 4× CPU throttle plus a slow-4G network profile.

## File map
```
src/lib/supabase/public.ts                     cookie-free client for cached public reads
src/features/marketing/data.ts (+ .test.ts)    getProPricing, getSportOptions, getPublicStats + pure helpers
src/features/marketing/hero-court.tsx           two-sides-of-the-net hero (server)
src/features/marketing/hero-search.tsx (+test) GET search form; client date fill
src/features/marketing/marketing.css           hero keyframes + reduced-motion rules
src/features/marketing/sports-switcher.tsx (+test)
src/features/marketing/how-it-works.tsx
src/features/marketing/owners-section.tsx      floodlit band: time-of-day strip, dashboard mock
src/features/marketing/pricing.tsx (+test)     pricing cards from getProPricing
src/features/marketing/stats-band.tsx
src/features/marketing/final-cta.tsx
src/features/marketing/motion/boot.tsx         client: loads motion after LCP/idle
src/features/marketing/motion/scenes.ts        GSAP + ScrollTrigger scene setup (dynamic import only)
src/features/marketing/faq.tsx
src/app/(marketing)/page.tsx                   compose the landing
src/app/(marketing)/opengraph-image.tsx
src/app/(marketing)/for-venues/page.tsx
src/app/(marketing)/legal/{legal-document.tsx,terms/page.tsx,privacy/page.tsx}
e2e/landing.spec.ts, e2e/marketing-perf.spec.ts
scripts/check-bundle.mjs                       initial-JS budget + "no gsap in initial chunks"
```

---

### Task 1: Public data readers

**Files:** Create `src/lib/supabase/public.ts`, `src/features/marketing/data.ts`, `src/features/marketing/data.test.ts`.

**Interfaces:**
- Produces:
  - `createPublicSupabase(): SupabaseClient<Database>`: publishable key, `{ auth: { persistSession: false, autoRefreshToken: false } }`, no cookies.
  - `type ProPricing = { monthlyCentavos: number; yearlyCentavos: number; trialDays: number; graceDays: number; yearlySavingCentavos: number | null }`
  - `yearlySavingCentavos(monthly: number, yearly: number): number | null`: `12*monthly - yearly` when positive, else `null`.
  - `getProPricing(): Promise<ProPricing>`: `'use cache'`, `cacheTag('platform-settings')`, `cacheLife('hours')`. Throws on query error.
  - `getSportOptions(): Promise<{ slug: string; name: string }[]>`: sports ordered by `sort`, cached `'days'`.
  - `type PublicStats = { venues: number; cities: number; sports: number }`
  - `STATS_MINIMUM = { venues: 10, cities: 3 } as const`
  - `statsWorthShowing(counts: PublicStats, min = STATS_MINIMUM): PublicStats | null`
  - `getPublicStats(): Promise<PublicStats | null>`: active venues, distinct cities (case-insensitive), distinct sports of active courts at active venues. Cached `'hours'`, then passed through `statsWorthShowing`.

- [ ] **Step 1: Write the failing tests** (`data.test.ts`, pure helpers only):
```ts
expect(yearlySavingCentavos(99900, 999000)).toBe(199800);
expect(yearlySavingCentavos(99900, 1198800)).toBeNull();   // no saving at exactly 12×
expect(yearlySavingCentavos(99900, 1500000)).toBeNull();
expect(statsWorthShowing({ venues: 10, cities: 3, sports: 6 })).toEqual({ venues: 10, cities: 3, sports: 6 });
expect(statsWorthShowing({ venues: 9, cities: 5, sports: 6 })).toBeNull();
expect(statsWorthShowing({ venues: 40, cities: 2, sports: 6 })).toBeNull();
```
- [ ] **Step 2: Run** `npm test -- src/features/marketing/data.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** the files above. The readers import `'server-only'`.
- [ ] **Step 4: Run** `npm test` and `npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(marketing): cached public readers for Pro pricing, sports and stats`

### Task 2: Hero, "two sides of the net"

**Files:**
- Create `src/features/marketing/{hero-court.tsx,hero-search.tsx,hero-search.test.tsx,marketing.css}` and `e2e/landing.spec.ts`.
- Modify `src/app/(marketing)/page.tsx`. It becomes the landing composition, with the hero first for now.

**Interfaces:**
- Consumes: `getSportOptions()` (Task 1), `CourtDiagram`/`COURT_SPECS` (M0), `buttonVariants` (M0).
- Produces:
  - `<HeroCourt />`: async server component.
    - Desktop is a horizontal court with Play on the left, the net in the centre, and Venues on the right.
    - Below `md` it's an upright court, Play on top and Venues below.
    - One `h1` (accessible name contains "Courtify") and two `h2`s.
    - "List your venue" links to `/owner/new`.
  - `<HeroSearch sports />`: client component.
    - A `GET` form to `/courts` with fields `sport` (select, first option "Any sport"), `city` (text) and `date` (date).
    - Empty fields are disabled before submit so they're omitted.
    - The date is filled after mount with `todayInManila()`.
  - `todayInManila(now?: Date): string`: `YYYY-MM-DD` in Asia/Manila, exported from `hero-search.tsx`.
  - CSS classes in `marketing.css`: `.chalk-in` (stroke-dashoffset draw), `.rally` (ball transform path), `.bounce-in` (per-word), each with a `prefers-reduced-motion: reduce` override to the finished state.

- [ ] **Step 1: Write the failing tests.**
  - `hero-search.test.tsx`:
  ```tsx
  expect(todayInManila(new Date('2026-11-21T17:30:00Z'))).toBe('2026-11-22');   // 01:30 Manila next day
  render(<HeroSearch sports={[{ slug: 'pickleball', name: 'Pickleball' }]} />);
  expect(screen.getByRole('combobox', { name: 'Sport' })).toHaveValue('');
  expect(screen.getByRole('search')).toHaveAttribute('action', '/courts');
  ```
  - `e2e/landing.spec.ts`:
    - `both doors are visible without scrolling`: on each project, `Book a court` and `List your venue` are in the viewport at load.
    - `search hands off to /courts`: select Pickleball, type Makati, submit. The URL matches `/\/courts\?sport=pickleball&city=Makati&date=\d{4}-\d{2}-\d{2}$/`.
    - `List your venue reaches the owner flow`: anonymous, the link ends on `/login?next=%2Fowner%2Fnew`.
    - `fits a 320px phone` (Review Focus 3): `page.setViewportSize({ width: 320, height: 640 })`. Expect `document.documentElement.scrollWidth <= 320`, and both doors in the viewport.
- [ ] **Step 2: Run** `npm test` and `npm run test:e2e -- e2e/landing.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - The court is inline SVG reusing `COURT_SPECS.tennis` (horizontal) and `CourtDiagram` styling; the net is dashed.
  - The ball path rallies across the net via CSS keyframes (`transform` only), with a ground shadow that scales with height.
  - Headline words bounce in with staggered `animation-delay`.
  - No GSAP in this task.
- [ ] **Step 4: Run** `npm test`, `npm run test:e2e`, `npm run lint`. Expected: PASS. The existing `home has a title and exactly one h1` test still passes.
- [ ] **Step 5: Commit** `feat(marketing): two-sides-of-the-net hero with CSS-only intro motion and search hand-off`

### Task 3: Motion boot (GSAP after LCP) + bundle gate

**Files:** Create `src/features/marketing/motion/{boot.tsx,scenes.ts}` and `scripts/check-bundle.mjs`. Modify `package.json` (dependency `gsap`; script `"check:bundle": "node scripts/check-bundle.mjs"`).

**Interfaces:**
- Produces:
  - `<MotionBoot />`: client component rendered once at the end of the landing and `/for-venues`.
    - After `window` `load` it calls `requestIdleCallback`, falling back to `setTimeout(…, 1)`.
    - If `matchMedia('(prefers-reduced-motion: reduce)')` doesn't match, it calls `import('./scenes').then((m) => m.startScenes())`.
  - `startScenes(): () => void`:
    - Registers ScrollTrigger and finds `[data-scene]` elements.
    - Sets "from" states only for scenes whose top is below the viewport.
    - Returns a cleanup function.
    - Scene names: `serve`, `daylight`, `dashboard`, `cta-roll`.
  - `scripts/check-bundle.mjs`: run after `next build`.
    - Reads `.next/app-build-manifest.json` (or the Next 16 equivalent in `.next/`; check `node_modules/next/dist/docs` for the manifest name). Fall back to `.next/server/app/(marketing)/page_client-reference-manifest.js`.
    - Sums the gzipped size of the initial client chunks for `/`.
    - Exits 1 if the total is over 153 600 bytes, or if any initial chunk contains the string `gsap`.
- [ ] **Step 1: Write the failing check.** Run `npm run check:bundle` before the script exists. Expected: FAIL (missing script).
- [ ] **Step 2: Implement** `check-bundle.mjs`, `boot.tsx` and a `scenes.ts` that registers ScrollTrigger and handles zero scenes. Render `<MotionBoot />` on the landing.
- [ ] **Step 3: Run** `npm run build && npm run check:bundle`. Expected: PASS, printing the initial KB for `/` and "gsap: not in initial chunks".
- [ ] **Step 4: Commit** `feat(marketing): lazy GSAP motion boot after LCP with an initial-JS budget check`

### Task 4: Sports switcher (court morph)

**Files:** Create `src/features/marketing/sports-switcher.tsx` and `sports-switcher.test.tsx`. Modify `src/features/marketing/motion/scenes.ts` (export `morphCourt`). Add the switcher to the landing.

**Interfaces:**
- Consumes: `COURT_SPECS`, `COURT_LINE_COUNT` (M0: 16 lines per sport, unused lines zero-length at the centre).
- Produces:
  - `<SportsSwitcher />`: client component.
    - `role="tablist"` labelled "Sports", six `role="tab"` buttons (Pickleball, Badminton, Tennis, Padel, Table tennis, Squash) and one `role="tabpanel"` with the court and a one-line description.
    - Roving tabindex. ArrowLeft and ArrowRight wrap; Home and End jump.
    - Auto-advances every 4 s while on screen (IntersectionObserver) and `!document.hidden`. It stops permanently after any user selection, and never runs under reduced motion.
  - `morphCourt(svg: SVGSVGElement, from: SportSlug, to: SportSlug): void`: GSAP `attr` tween of the 16 `line` elements' `x1/y1/x2/y2` and the court `rect` size.
    - If GSAP isn't loaded yet, the switcher swaps instantly.
- [ ] **Step 1: Write the failing tests** (Review Focus 5):
```tsx
render(<SportsSwitcher />);
const tabs = screen.getAllByRole('tab');
expect(tabs).toHaveLength(6);
tabs[0].focus(); await userEvent.keyboard('{ArrowLeft}');
expect(screen.getByRole('tab', { name: 'Squash' })).toHaveFocus();          // wraps
await userEvent.keyboard('{Home}');
expect(screen.getByRole('tab', { name: 'Pickleball' })).toHaveFocus();
await userEvent.click(screen.getByRole('tab', { name: 'Tennis' }));
expect(screen.getByRole('tab', { name: 'Tennis' })).toHaveAttribute('aria-selected', 'true');
expect(screen.getByRole('tabpanel')).toHaveAccessibleName(/Tennis/);
// auto-advance stops after interaction:
vi.useFakeTimers(); act(() => { vi.advanceTimersByTime(8000); });
expect(screen.getByRole('tab', { name: 'Tennis' })).toHaveAttribute('aria-selected', 'true');
```
- [ ] **Step 2: Run** `npm test -- sports-switcher`. Expected: FAIL.
- [ ] **Step 3: Implement.** The descriptions are one line per sport (plain copy; e.g. "Pickleball: the fastest-growing game in Manila's barangay courts"). Keep claims modest.
- [ ] **Step 4: Run** `npm test`, `npm run build && npm run check:bundle`. Expected: PASS (gsap still not initial).
- [ ] **Step 5: Commit** `feat(marketing): sports switcher that morphs one court between six sports`

### Task 5: How it works (scroll-scrubbed serve)

**Files:** Create `src/features/marketing/how-it-works.tsx`. Modify `scenes.ts` (scene `serve`) and the landing.

**Interfaces:**
- Produces: `<HowItWorks />`, a server component.
  - `<section data-scene="serve" aria-labelledby>` with an `h2`.
  - An ordered list of three steps: "Search", "Pick a slot", "Play", each with one line of copy.
  - An SVG ball path whose progress maps to scroll (ScrollTrigger `scrub`). The ball moves via `transform` only.
- [ ] **Step 1: Write the failing e2e** in `landing.spec.ts`: `how it works lists the three steps`. Expect the list items `Search`, `Pick a slot`, `Play` in order.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm run test:e2e -- e2e/landing.spec.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(marketing): scroll-scrubbed serve through how booking works`

### Task 6: Owners section (floodlit)

**Files:** Create `src/features/marketing/owners-section.tsx`. Modify `scenes.ts` (scenes `daylight`, `dashboard`) and the landing.

**Interfaces:**
- Produces: `<OwnersSection />`, a server component and the longest landing section.
  - `bg-ink text-chalk`, with `id="for-venues"` for in-page links.
  - **Pain and fix copy:** today's Messenger threads, calls, a notebook and double bookings, set against online booking with no double booking, GCash proofs checked in one place, front-desk check-in, and analytics.
  - **Time-of-day strip (`data-scene="daylight"`):** a mini booking grid (courts × hours) whose overlay shifts from morning to golden hour to floodlights on scroll. The overlay is opacity only.
  - **Dashboard mock (`data-scene="dashboard"`):** booking cards drop in (transform), a "GCash proof → Verified" chip flips, and scoreboard digits flip (transform).
  - The visible label `Product preview` sits on the mock container, and every figure in it is illustrative.
  - A `List your venue` call to action to `/owner/new`, plus a `See how it works for venues` link to `/for-venues`.
- [ ] **Step 1: Write the failing e2e:** `owners section is labelled as a product preview and links onward`. Expect `getByText('Product preview')` visible, links `/owner/new` and `/for-venues`, and `region` "For venues" present.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Check chalk-on-ink and sand-on-ink pairs in the contrast test; add any new pair there.
- [ ] **Step 4: Run** `npm test`, `npm run test:e2e -- e2e/landing.spec.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(marketing): floodlit owners section with time-of-day strip and dashboard preview`

### Task 7: Pricing, stats band, closing call to action

**Files:**
- Create `src/features/marketing/{pricing.tsx,pricing.test.tsx,stats-band.tsx,final-cta.tsx}`.
- Modify `scenes.ts` (scene `cta-roll`) and the landing.

**Interfaces:**
- Consumes: `getProPricing`, `getPublicStats` (Task 1), `formatPHP`.
- Produces:
  - `pricingCopy(p: ProPricing): { monthly: string; yearly: string; saving: string | null; trial: string | null; grace: string | null }`, a pure function in `pricing.tsx`:
    - `trial`: `'Start with a {n}-day free trial'`, or `null` when `n = 0`.
    - `grace`: `'{n} days of grace if a payment runs late'`, or `null` when `0`.
    - `saving`: `'Save {formatPHP(saving)} a year'`, or `null`.
  - `<Pricing />` (async server): two cards. **Free listing** covers the venue page, call and Messenger buttons, and showing in search. **Pro** is per venue and lists online booking plus the operations tools.
  - `<StatsBand />` (async server): renders `null` when `getPublicStats()` is `null`.
  - `<FinalCta />`: both doors, "Find a court" to `/courts` and "List your venue" to `/owner/new`. Scene `cta-roll` rolls the ball into the button (transform).
- [ ] **Step 1: Write the failing tests** (Review Focus 4):
```ts
expect(pricingCopy({ monthlyCentavos: 99900, yearlyCentavos: 999000, trialDays: 30, graceDays: 7, yearlySavingCentavos: 199800 }))
  .toEqual({ monthly: '₱999', yearly: '₱9,990', saving: 'Save ₱1,998 a year', trial: 'Start with a 30-day free trial', grace: '7 days of grace if a payment runs late' });
expect(pricingCopy({ monthlyCentavos: 99900, yearlyCentavos: 1198800, trialDays: 0, graceDays: 0, yearlySavingCentavos: null }))
  .toMatchObject({ saving: null, trial: null, grace: null });
```
  (Use whatever `formatPHP` returns for whole pesos; match its existing tests in `src/lib/money.test.ts`.)
  - e2e `pricing shows the platform settings`: the Pro card contains `formatPHP(99900)` and `formatPHP(999000)` and "30-day".
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` and `npm run test:e2e -- e2e/landing.spec.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(marketing): live Pro pricing, real-stats band and closing call to action`

### Task 8: `/for-venues`

**Files:** Create `src/features/marketing/faq.tsx`. Modify `src/app/(marketing)/for-venues/page.tsx`.

**Interfaces:**
- Consumes: `OwnersSection` visual pieces (reuse the dashboard mock, not a copy), `<Pricing />`, `<MotionBoot />`.
- Produces:
  - **The page:** an `h1` "For venues", a feature walkthrough (Today board, calendar, check-in, GCash proofs, analytics, activity log, team roles) worded as what the dashboard does, then "How billing works" from `getProPricing`, the FAQ, and a call to action to `/owner/new`. Metadata title "For venues".
  - `<Faq items={{ q: string; a: string }[]} />`: native `<details>`/`<summary>`.
  - The FAQ includes at least these, with answers matching the main spec:
    - "Is listing free?"
    - "What happens if Pro lapses?" (the listing stays, existing bookings stay valid, check-in keeps working)
    - "Do players pay through Courtify?" (no; owners collect at the venue or by GCash)
    - "Can my staff use it?" (owner, manager and staff roles)
    - "How long does setup take?" (about 15 minutes)
- [ ] **Step 1: Write the failing e2e:** `for-venues answers the owner questions`. Expect the h1 "For venues", five `summary` elements with those questions, expanding "What happens if Pro lapses?" shows text containing "existing bookings", and pricing shows `formatPHP(99900)`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm run test:e2e`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(marketing): full for-venues page with billing explainer and FAQ`

### Task 9: Legal drafts and metadata

**Files:**
- Modify `src/app/(marketing)/legal/{legal-document.tsx,terms/page.tsx,privacy/page.tsx}`.
- Create `src/app/(marketing)/opengraph-image.tsx`.
- Modify page metadata (landing description, for-venues description).

**Interfaces:**
- Produces:
  - `LEGAL_LAST_UPDATED = '2026-11-22'` (a constant in `legal-document.tsx`).
  - `<LegalDocument title sections />`, where `sections: { heading: string; body: ReactNode }[]`. It renders the "Draft — not legal advice" marker, "Last updated {date}", a table of contents (in-page links) and `h2` per section.
  - The privacy page names `[Operator name]` and `[contact email]` as literal placeholders.
  - Section headings, exact (privacy):
    - "Who we are"
    - "What we collect"
    - "Why we use it"
    - "Who can see it"
    - "Where it's stored"
    - "How long we keep it"
    - "Your rights"
    - "Keeping it safe"
    - "Cookies"
    - "Changes"
    - "Contact"
  - Section headings, exact (terms):
    - "What Courtify is"
    - "Your account"
    - "Booking and cancelling"
    - "For venues"
    - "Pro billing"
    - "Acceptable use"
    - "Suspension"
    - "Liability"
    - "Governing law"
    - "Contact"
  - "Your rights" names the RA 10173 rights (be informed, access, object, erasure or blocking, damages, portability, rectification, file a complaint with the National Privacy Commission).
  - `opengraph-image.tsx`: 1200×630, court art and the wordmark, from `next/og` (`ImageResponse`), static.
- [ ] **Step 1: Write the failing e2e:**
  - `legal drafts are complete`: each page shows "Draft — not legal advice", "Last updated", and all of its exact headings as `h2`.
  - `/` has an `og:image` meta whose URL responds 200 with `image/png`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Plain-language drafts. Terms governing law: Philippines. Data processors: Supabase (Singapore region) and Vercel.
- [ ] **Step 4: Run** `npm run test:e2e`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(marketing): Terms and Privacy drafts (RA 10173) and landing OG image`

### Task 10: Resilience and performance gates

**Files:** Modify `e2e/landing.spec.ts`. Create `e2e/marketing-perf.spec.ts`.

- [ ] **Step 1: Write the tests.**
  - `landing works without JavaScript` (Review Focus 1). Use `browser.newContext({ javaScriptEnabled: false })` on `/`:
    - both doors visible
    - the search form submits to `/courts?...`
    - the Pro card shows prices
    - the sports switcher shows Pickleball's court and description
  - `reduced motion shows the finished page` (Review Focus 2): `page.emulateMedia({ reducedMotion: 'reduce' })`.
    - `document.getAnimations().length === 0` after load.
    - Every `[data-scene]` element has computed `opacity: '1'`.
    - No console errors.
  - `no console errors on the marketing pages`: `/`, `/for-venues`, `/legal/terms`, `/legal/privacy`, each recording `console` errors and `pageerror`. Expect none.
  - `marketing-perf.spec.ts` (desktop project only, via `test.skip(testInfo.project.name !== 'desktop')`):
    - Apply CDP `Emulation.setCPUThrottlingRate { rate: 4 }`, plus `Network.emulateNetworkConditions` (latency 150 ms, 1.6 Mbps down, 750 Kbps up), on a 412×915 viewport.
    - Load `/` and read `largest-contentful-paint` and `layout-shift` via buffered `PerformanceObserver`.
    - Expect LCP < 2500 and CLS < 0.05.
    - Then observe `longtask` for 3 s during the hero animation and expect none over 50 ms.
- [ ] **Step 2: Run** `npm run test:e2e`. Expected: any failures point at real issues. Fix the code, not the thresholds.
- [ ] **Step 3: Run the full gate:**
  - `npm run lint`
  - `npm test`
  - `npm run build`
  - `npm run check:bundle`
  - `npm run db:test`
  - `npm run test:e2e`

  Expected: all PASS, and zero `[WebServer]` error lines in the e2e output.
- [ ] **Step 4: Visual check.** Screenshot `/` and `/for-venues` on desktop and Pixel 7, at rest and with reduced motion. Check them against the anti-goals (template look, contrast, Fugaz ≥ 20px, no stock imagery).
- [ ] **Step 5: Commit** `test(marketing): no-JS, reduced-motion and performance gates for the marketing pages`
