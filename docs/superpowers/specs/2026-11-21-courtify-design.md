# Courtify: design and build plan

## Context

`c:\PROJECTS\courtify` is empty, so this is a new build. CJ wants a court-booking platform for racket sports aimed at the PH market. It is two products on one platform, plus an admin side:

- **Players (free):** anyone can browse and search courts without an account, then sign in to reserve and manage bookings.
- **Court owners (paid SaaS):** listing a venue is **free**. **Pro** is billed per venue and starts with a 30-day trial. It unlocks online reservations and the venue operations platform: monitoring, logging and reserving.
- **Platform admin (CJ):** approves venues, verifies subscription payments, oversees users and bookings, and reads the audit trail.
- A dedicated **landing page**. Fonts are Fugaz One + Work Sans, colours come from the reference palette, and the feel is modern and animated. Logos and photos are placeholders for now.

**Why it's shaped this way:** owners are the paying customers, so the owner tools are the core product. The free player directory is the distribution that makes Pro worth paying for. Free listings fill the directory quickly. This addresses the cold-start problem: with no venues there are no players, and with no players there are no venues. Every venue also gets a shareable booking page it can post on its FB page.

### Decided with CJ
- **Stack: Next.js + Supabase.** It beat Vite React + Express + Prisma, which would mean building auth by hand, writing and hosting more API code, and getting no server rendering for SEO or FB link previews on public pages.
- **Player payments are collected by the owner, with no payment gateway.** Each venue picks pay-at-venue, or GCash-to-owner with a proof upload that the owner verifies.
- **Owner tiers:** free listing, paid Pro tools, and a 30-day Pro trial.
- **Owner billing is manual.** The owner pays CJ's GCash or bank account and uploads proof. CJ verifies it in admin, and Pro runs until an end date.
- **v1 extras:** map + near-me search. Not in v1: email notifications, open play, reviews.

### Goals / non-goals / anti-goals
- **Goals:** a player finds and reserves a court in under a minute on a phone. An owner lists a venue in one sitting (about 15 min). Owners run their day from Courtify (calendar, check-in, payments, logs). CJ runs the platform from admin.
- **Non-goals (v1):** payment gateways (PayMongo comes later behind the same payment step), email or SMS notifications (in-app only), open play, reviews, recurring or league bookings, multi-court carts, multiple paid tiers, native apps, dark mode, Facebook login, paid ranking boosts in search, and letting owners claim admin-seeded venues.
- **Anti-goals** (each would count as a failure even if everything technically works):
  - a double booking, ever
  - one venue seeing another venue's player data
  - landing-page motion that stutters on budget Android phones
  - anything that looks like a template
  - an onboarding flow long enough that owners give up halfway

### Constraints
- **Team and business:** CJ is a solo developer with no business registration, which rules out payment gateways for now. All money is stored as PHP centavos (integers), and every venue time is in Asia/Manila.
- **Users:** PH users are mobile-first, often on mid- or low-end Android phones with variable connections.
- **Tooling on this machine:** Node 24, npm, Docker 29 (so the local Supabase stack runs through `npx supabase`). The Supabase CLI isn't installed globally and neither is the Vercel CLI.
- **Hosting costs:** Vercel Hobby is limited to non-commercial use, and Supabase Free pauses idle projects and has caps. Before charging owners, expect Vercel Pro + Supabase Pro at about $45/mo.

## Calls I made (flagging for review)
1. Pro is billed **per venue**, not per owner account.
2. The trial starts when admin approves the venue. Pro has a **7-day grace** period after expiry. Default prices are placeholders, ₱999/mo or ₱9,990/yr per venue, and admin can edit them.
3. **When Pro lapses:** the listing stays up on the free tier. New online bookings and walk-ins stop. Existing upcoming bookings stay valid, players still see them, and the owner keeps read access and check-in for them.
4. **Every venue needs admin approval** before it is publicly listed. The owner can still set it up and preview it before then.
5. Players browse without an account. Sign-in is asked for only at booking, and the selected slot survives the sign-in step.
6. **GCash-proof bookings** are held for 30 min (configurable per venue) while the player uploads proof, then the owner verifies. A rejected proof cancels the booking with a reason. Refunds happen off-platform; the owner marks a payment `refund_due` → `refunded`.
7. **Check-in is optional.** Confirmed bookings auto-complete after their end time unless they were marked as no-show.
8. **Owner, manager and staff roles** are modelled from day one. Team invites use a single-use link that expires after 7 days, so they don't need email.
9. Search has no paid ranking. A "Bookable online" filter chip covers Pro venues.
10. **Light theme only.** Tokens are CSS variables so a dark "floodlight" theme can be added later.
11. **Maps:** MapLibre GL + **OpenFreeMap** tiles, which need no API key, allow commercial use, and take a style recoloured to the palette. Owners place their venue by dragging a pin, with debounced Nominatim address search as a helper.
12. Supabase region is Singapore, and Vercel functions run in `sin1`.
13. Seed venues are fictional, with no real business names.
14. Booking prices are fixed at booking time. Changes to rates, hours or payment mode apply only to new bookings, and the UI warns about upcoming bookings they would conflict with.

## Architecture
- **Next 16 App Router** on Turbopack with TypeScript strict, React 19.2 and `proxy.ts`. Server Components and Server Actions by default. TanStack Query only in the owner and admin client areas, for live lists and calendars.
- **Supabase:** Postgres (with PostGIS, btree_gist, pg_trgm and pg_cron), Auth (email/password, plus Google once credentials exist), Storage and Realtime. Migrations live in `supabase/migrations`, dev data in `seed.sql`, and generated types in `src/lib/supabase/types.ts`.
- **UI:** Tailwind v4 with tokens defined in `@theme`, shadcn/ui on Radix, sonner for toasts, react-hook-form + zod (one schema shared by client and server action), TanStack Table, Recharts through shadcn charts, `nuqs` for search state in the URL, date-fns + `@date-fns/tz`, `qrcode` for booking passes, `qr-scanner` for check-in.
- **Motion:** `motion/react` across the app. GSAP (all plugins are free since 3.13) and Lenis are loaded **on the landing page only**, via dynamic import.
- **Images:** the client resizes first, which keeps uploads under Vercel's 4.5 MB body limit. A route handler then checks the file's magic bytes with `file-type`, re-encodes with `sharp` to WebP at 480/960/1600 px, and strips EXIF (which can include GPS). Files are stored at immutable versioned paths and served through a custom `next/image` loader that picks the right width, so Vercel's image optimisation isn't needed.
- **Caching:** public venue data uses `'use cache'` + `cacheTag('venue:<id>')`, and owner edits call `revalidateTag`. Availability and search are always dynamic.
- **Realtime:** the owner calendar and Today board subscribe to `postgres_changes` on `bookings`, filtered by venue and respecting RLS. The player slot grid listens on a public broadcast channel `availability:<venueId>`, fed by a DB trigger that sends no personal data (court, range, state only).
- **Layout:** `src/app` holds routes in groups (marketing, public, auth, player, owner, admin). `src/features/<area>` holds components, actions, queries and schemas. `src/components/{ui,brand,motion}` holds shared components. `src/lib/{supabase,time,money,codes,permissions}` holds utilities. Tests sit in `supabase/tests` (pgTAP) and `e2e/` (Playwright).

## Data model (key tables)
| Table | Key columns / rules |
|---|---|
| `profiles` | `id` → `auth.users`, full_name, phone, avatar_path. Created by a trigger on signup. |
| `platform_admins` | `user_id`. The **only** source of admin rights; roles never live in user metadata, which users can edit. |
| `sports`, `amenities` | Admin-managed catalogs. Seeded with pickleball, badminton, tennis, padel, table tennis and squash. |
| `venues` | slug, name, description, address, city, `location geography(Point)`, timezone, contact (phone, Messenger/FB URLs). `status`: draft → pending_review → active, or rejected / suspended. Booking settings: slot_minutes (30 or 60), min/max duration, advance_days, min_lead_minutes, cancel_cutoff_hours, payment_mode (`at_venue` or `gcash_proof`), hold_minutes, GCash QR/name/number. Also `trial_ends_at`, `pro_until`, and a search `tsvector`. |
| `venue_members` / `venue_invites` | Role is owner, manager or staff. Invite tokens are stored hashed, single-use, and expire. |
| `venue_photos`, `venue_amenities`, `venue_hours` | `venue_hours`: weekday, opens_at, closes_at. A close time at or before the open time means the venue closes past midnight. |
| `courts` / `court_rates` | Court: sport, surface, indoor, lights, base_rate, active. Rate: weekdays[], start/end time, rate_per_hour (peak/off-peak). |
| `bookings` | code (6 chars, no ambiguous characters), venue, court, player (nullable), `kind` (online, walk_in or block), customer name/phone for walk-ins, **`during tstzrange '[)'`**, status, hold_expires_at, price_total, payment_mode, payment_status, checked_in_at, cancel_reason. **`EXCLUDE USING gist (court_id WITH =, during WITH &&) WHERE status IN ('held','pending_verification','confirmed','checked_in')`**: because the range is half-open, back-to-back bookings are allowed and overlaps can never be stored. |
| `booking_payments` | amount, reference_no, private proof path, status (submitted, verified or rejected), reviewer, reason. |
| `booking_events` | Append-only log of every status change: actor, from, to, note, at. |
| `subscription_payments` | venue, period (monthly or yearly), amount, reference_no, proof path, status, reviewer, reason. |
| `platform_settings` | One row: Pro prices, trial days, grace days, CJ's GCash QR and bank details, an optional announcement. |
| `favorites`, `notifications` | Notifications have type, payload and read_at, and Realtime drives the unread count. |
| `audit_log` | Written by triggers on venue-scoped tables and admin actions: actor, venue, entity, action, and a diff of only the columns that changed. |

## Access model (RLS on every table, deny by default)
Helper functions are `security definer` with `search_path = ''`: `is_platform_admin()`, `venue_role(venue_id)` and `venue_has_pro(venue_id)`. **All booking and billing state changes go through RPCs that enforce the state machine.** Clients get no direct UPDATE on status columns.

| Data | anon | player | staff | manager | owner | admin |
|---|---|---|---|---|---|---|
| Active venues, courts, rates, hours, photos | read | read | read | read | read | all |
| Availability (busy ranges only, no personal data, via RPC) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Bookings | – | own | venue: read, check-in, walk-in | + verify payments, cancel, blocks | + all | all |
| Payment proofs (private bucket, signed URLs) | – | own | – | venue | venue | all |
| Setup (courts, rates, hours, profile) | – | – | read | write | write | all |
| Billing, team, venue deletion | – | – | – | – | own venue | all |
| Audit log | – | – | – | venue | venue | all |

On the server, identity is checked with `getClaims()`, not `getSession()`. `proxy.ts` only refreshes cookies and does coarse redirects. Owner and admin layouts and every server action re-check access, because a proxy-only auth check can be bypassed. The Supabase secret key is imported only in `server-only` modules.

## Booking engine (all in SQL; built test-first)
- **States:** `held` → `pending_verification` → `confirmed` → `checked_in` → `completed`. Exits: `cancelled`, `expired`, `no_show`.
  - Pay-at-venue bookings and walk-ins start as `confirmed`.
  - Blocks are `kind = block` with status `confirmed`, so they share the overlap constraint.
- **`quote_booking(court, start, end)`** is the single pricing truth. It sums the rate segments in the venue's timezone (for example a 5–7 PM booking where peak starts at 6). The UI calls it with debouncing and never computes prices itself.
- **`create_booking(court, start, duration)`** checks, in order:
  1. The venue is Pro.
  2. The booking falls within opening hours and is aligned to the slot length.
  3. It respects lead time, the advance-booking window and min/max duration.
  4. DB caps: at most 2 active holds per player platform-wide, and at most 10 booking attempts per hour. Because these live in the database, signing out or clearing state can't reset them.
  5. It lazily expires stale holds on that court, then inserts.

  An exclusion violation (`23P01`) is mapped to "Someone just took that slot", and the grid refreshes.
- **`get_availability(venue, date)`:** returns per-court open/close times and busy ranges labelled booked, held or blocked.
- **`search_venues(…)`:**
  - Filters: sport, text (tsvector + trigram), distance (`ST_DWithin`), max price, indoor, amenities, bookable-online, and "free at time X for N min" (an `EXISTS` query against the GiST index).
  - Sorts by distance, price or newest.
- **pg_cron jobs:**
  - Every minute: expire holds.
  - Every 15 min: auto-complete bookings that have ended, and send in-app reminders 2 h before start.
  - Daily: Pro expiry reminders at 7, 3 and 1 days.

  Every state has an exit tied to the event that ends it.

## Pro entitlement and billing
- **`venue_has_pro`:** now < greatest(`pro_until`, `trial_ends_at`) + grace. One function, so adding tiers later is a contained change.
- **Owner Billing page:**
  - Status card: "Trial: 18 days left", "Pro until Dec 30" or "Free listing".
  - Monthly or yearly choice, plus CJ's GCash QR and bank details from `platform_settings`.
  - A form for amount, reference number and proof upload, and a payment history with statuses.
- **Admin queue:** verifying a payment extends `pro_until` from max(now, pro_until) by the paid period. Rejecting requires a reason. Admin can also set `pro_until` manually, for comps or trial extensions. All of these are audited and send the owner an in-app notification.
- **Locked state:** Pro-only screens stay visible in the nav with a lock and the word "Pro". Opening one shows what it does plus a path to upgrade. Nothing is hidden.

## Screens and navigation
One account can wear several hats. The avatar menu shows "Venue dashboard" for venue members and "Admin" for admins.

**Public / player.** Top bar: logo, Find courts, For venues, Sign in or avatar. Signed-in players on mobile also get a bottom bar: Explore, Bookings, Saved, Profile.
- **`/` (landing)** and **`/for-venues`** (owner pitch + pricing), plus `/legal/terms` and `/legal/privacy`. The legal pages are drafts, marked "not legal advice", with RA 10173 consent at signup.
- **`/courts`** (search)
  - Desktop: filter bar, then a split list + map, with hover kept in sync between them.
  - Mobile: list with a Map button that opens a full sheet.
  - "Near me" asks for location only when tapped and falls back to a city picker.
  - All filters live in the URL.
- **`/v/[slug]`** (venue page, short so it suits FB posts)
  - Arch-masked gallery, sports, "from ₱X/hr", open/closed now (as a word), amenities, courts, map, share.
  - Venue page per tier:
    - **Free venue:** Call and Messenger buttons, plus "Online booking not available here yet".
    - **Pro venue:** a 14-day date strip, then a slot grid with courts × times, live updates and arrow-key navigation, then duration, then a sticky summary.
  - OG image built with `next/og`, JSON-LD, and a sitemap.
- **`/book/...`** (review), then confirm.
  - Pay-at-venue: goes straight to the pass.
  - GCash proof:
    1. A held state with a countdown, the owner's QR, the amount and the reference to use.
    2. Upload of proof + reference.
    3. Pending verification, then Confirmed, which arrives through Realtime.
- **`/me/bookings`** (upcoming / past) and **`/me/bookings/[code]`** (the pass: QR, details, directions, `.ics`, cancel within the cutoff), plus `/me/favorites`, `/me/profile` (including account deletion) and `/me/notifications`.

**Owner** (`/owner`, `/owner/new`, `/owner/[venueId]/…`). On desktop there's a sidebar with a venue switcher. On mobile the bottom bar is Today, Calendar, **Check-in** (centre), Payments, More.
- **Onboarding wizard:** basics → location pin → courts → hours and base prices → photos → review and submit, with an optional business permit upload. Each step saves on the server, so the owner can resume later.
- **Operate:**
  - **Today:** live "court board" showing each court's Now/Next with countdowns, a **TV mode** (fullscreen + Wake Lock) for the front desk, payments to verify, today's occupancy and revenue, and a live feed of new bookings.
  - **Calendar:** a day view with courts as columns and slots as rows. Dragging over empty slots creates a walk-in or block, and a "New booking" form does the same for keyboard and mobile users. On mobile it becomes an agenda. Clicking a booking opens a drawer with its actions.
  - **Bookings:** filters, search by code or name, CSV export.
  - **Check-in:** camera QR scan or typed code, then a result card with Check in / Mark paid.
  - **Payments:** proof viewer with Verify and Reject (with a reason).
- **Setup:** Courts, Pricing (a visual week-grid editor for peak/off-peak), Hours & policies (slot length, windows, cancellation, payment mode, GCash QR), Venue profile (photos you can reorder, amenities, pin).
- **Insights:** Analytics and Activity log.
  - Analytics: occupancy % (booked ÷ open court-minutes), booked vs collected value, a weekday × hour heatmap, a per-court breakdown, the online vs walk-in split, and cancel/no-show rates.
  - Activity log: plain sentences built from audit diffs, such as "Ana changed Court 2 Mon–Fri 6–10 PM from ₱450 to ₱500".
- **Account:** Team (invite links), Billing, Settings, and a **Share kit** with the venue link and a QR PNG for a printed poster.

**Admin** (`/admin`). Sidebar items: Overview, Venue approvals (with count badge), Subscriptions (with count badge), Venues, Users, Bookings, Catalog, Audit log, Platform settings.
- **Overview:** users (total and new), venues by status, Pro/trial/expired counts, estimated MRR, bookings per day, and the age of the oldest queued item.
- **Approvals:** shows the venue page in preview mode with a checklist; approve, reject with a reason, or suspend.
- **Users:** search, view, disable. Disabling uses the service role in a server action and is audited.

## Design system

**Palette.** Values were sampled from the reference image; I'll refine them with an eyedropper in M0.

| Token | Hex | Role |
|---|---|---|
| `clay` | `#D1873A` | CTAs, active states, large display type |
| `sand` | `#D8A878` | Secondary fills, highlights |
| `stucco` | `#ECE9E5` | Page background |
| `greige` | `#DDD6D2` | Borders, subtle fills |
| `taupe` | `#BFAE9C` | Muted UI, map roads |

The palette has no text colour, so these are added:

| Token | Hex | Contrast |
|---|---|---|
| `chalk` | `#F8F6F2` | Surfaces |
| `ink` | `#2A1D14` | Body text |
| `ink-soft` | `#6A5848` | ≈5.6:1 on stucco |
| `clay-ink` | `#94501A` | Orange text and links, ≈5.1:1 |

- Text on clay is always ink (≈5.6:1). White or chalk on clay is ≈2.7:1, which fails even the 3:1 large-text bar, so it isn't used at any size.
- Status colours are warm-family success, warning and danger, and always come with an icon and a word.
- A Vitest test checks every declared text/background pair at ≥4.5:1.

**Type.** Fugaz One (one weight, slanted) is for display only: hero, section titles, scoreboard numbers and the wordmark. It is never used below about 20px or for body text. Work Sans variable handles UI and body, with `tabular-nums` for times and prices. Both load through `next/font`.

**Shape and texture.** The motifs come from the reference photo:
- **Arch-topped image masks.**
- **One sun direction**, top-left, which casts long soft warm shadows.
- **Chalk court lines** as dividers and accents.
- **A faint grain** on the stucco.
- **Radius:** 14px cards, pill buttons, arch media.
- **Placeholders:** a Fugaz One wordmark with a clay-ball tittle on the "i", a ball favicon, SVG top-down court diagrams for each sport, and royalty-free photos stored in the seed bucket.

**State is shown by form and a printed word, never by colour alone.**
- **Slot grid:**
  - Open shows its price.
  - Held is hatched and says "Held".
  - Booked is solid and says "Booked".
  - Closed is cross-hatched and says "Closed".
  - Past is faded and says "Past".
  - Selected is clay with a check and says "Selected".
- **Booking status chips:** each has its own icon and border style.

**Motion.** Every landing section gets one signature motion taken from racket sports itself, rather than generic fades:
1. **Hero:** court lines chalk themselves in, then a ball rallies across with a ground shadow that tracks its height. The headline words land like a bounce, and the search bar sits below.
2. **Sports switcher:** one court diagram re-draws its lines between the six sports.
3. **How it works:** a scroll-scrubbed serve carries the ball through Search → Pick a slot → Play.
4. **Time-of-day strip:** a booking-grid preview whose light shifts from morning to golden hour to floodlights.
5. **For venues** (a dark espresso "floodlit" section): bookings drop into a dashboard mock and scoreboard numbers flip. It's labelled as a product preview, with no invented stats.
6. **Pricing card,** then a **final CTA** where the ball rolls into the button.

Stats only appear when they come from real DB counts and are above a minimum.

**App motion:**
- Route changes animate only the content area.
- The venue card morphs into the venue hero using View Transitions, as a progressive enhancement.
- Spring selection on the slot grid, bouncing toasts, and staggered lists on first load only.

**Motion rules:**
- Animate only transform and opacity.
- Effects write to CSS variables or motion values, never React state.
- Cursor effects only on `(pointer: fine)`.
- Loops pause offscreen and when the tab is hidden.
- With reduced motion, everything shows its finished state using the same markup, so there are no hydration mismatches.

## Quality bar (from the lessons log, applied as checks)
- **Async views:** each has separate loading, error and empty states. The empty state only shows after data has actually arrived.
- **No blank shell:** layouts persist, `loading.tsx` sits inside content segments, skeletons appear only after about 250 ms, and links prefetch.
- **A11y primitives from day one:** Radix dialogs and sheets, labelled fields, a title on every route, styled `error`/`not-found` pages inside the shell, a skip link, and a global `:focus-visible` ring. The whole booking flow works by keyboard alone.
- **Mutations:**
  - Every write fires a toast after the DB commit.
  - Save stays disabled until something changed.
  - Demo quick-logins exist only in development builds.
- **Floating elements:** popovers and map popups handle keys only when they have focus. Toasts sit above the mobile bottom bar.
- **Heavy assets:** MapLibre and GSAP are dynamic imports, prefetched when the browser is idle. Content that sits on top of them waits until they're ready.
- **Speed budget,** measured on the "mid-tier mobile" throttle profile:
  - Landing: LCP < 2.5 s, CLS < 0.05, initial JS ≈ 150 KB gzipped or less, with GSAP loaded after LCP.
  - App routes: aim for ≤ 100 KB first load.

## Milestones
Each milestone gets its own detailed task plan (via the writing-plans skill) before I build it.

| # | Milestone | Covers | Skills used |
|---|---|---|---|
| **M0** | Foundation | `create-next-app` + git init. Tokens, fonts, shadcn primitives, brand components (Logo, ArchFrame, CourtDiagram, StatusChip, DelayedSkeleton, EmptyState/ErrorState), four app shells, the a11y baseline. Local Supabase with all migrations, RLS, RPCs, storage buckets/policies, cron, Realtime trigger, seed (fictional venues across Metro Manila and Cebu, 60 days of history, demo accounts per role), and type generation. Auth (signup, login, forgot/reset, profile trigger, `proxy.ts`). Vitest, Playwright and pgTAP wired up. | supabase, postgres-best-practices, TDD |
| **M1** | Landing + `/for-venues` + legal stubs | | design-taste-frontend |
| **M2** | Public directory | Search with list, map and URL state, venue page in free and Pro modes, favorites, OG/JSON-LD/sitemap. | |
| **M3** | Owner platform | Onboarding wizard through Share kit, plus Pro gating and locked states. Comes before player booking because owners are the paying customers; seed data covers the player side in the meantime. | dataviz for Analytics |
| **M4** | Player booking | Slot grid, quote, hold, proof upload, pass with QR and `.ics`, my bookings, cancellation, in-app notifications. | |
| **M5** | Admin | Overview, approvals, subscription verification, directories, user disable, catalogs, audit, platform settings. | |
| **M6** | Hardening + launch prep | Full e2e suite, performance and Lighthouse passes, Supabase advisors, remote project + Vercel deploy (only after CJ confirms). | impeccable for a UI polish pass |

**How I'll work:**
1. Once you approve this, I save it to `docs/superpowers/specs/2026-11-21-courtify-design.md`.
2. Then I write the detailed M0 task plan.
3. I ask before any commit, before creating the remote Supabase project, and before deploying.

## Verification
- **`npx supabase start`, then `npx supabase db reset`:** migrations and seed apply cleanly.
- **`npx supabase test db` (pgTAP):**
  - The full RLS matrix above, one row per role.
  - An overlapping insert fails.
  - Two sessions racing `create_booking` produce exactly one winner.
  - Holds expire.
  - A free venue rejects `create_booking`.
  - A verified subscription extends `pro_until` correctly.
  - Staff can't verify payments.
  - Players can't see other players' bookings.
- **`npm test` (Vitest):** slot generation including past-midnight hours, pricing across a peak boundary, Manila date-boundary handling, booking codes, token contrast ratios.
- **`npm run test:e2e` (Playwright on port 3107, against the stack the script started; it checks health first):**
  1. An anonymous visitor searches and reaches a venue page.
  2. A player books at a GCash venue and uploads proof; the owner verifies; the player sees Confirmed live.
  3. An owner's walk-in shows up as "Booked" on the player grid.
  4. An owner signs up, onboards and submits; admin approves; the venue is listed with a trial.
  5. An owner submits a subscription proof; admin verifies; Pro is extended.
  6. A lapsed venue shows the contact buttons instead of the grid.
  7. Booking works by keyboard only.
  8. Everything runs at a 390px mobile viewport.
  9. Under reduced motion, the console shows no hydration errors.
- **Visual:** Playwright screenshots of the landing at 390 and 1440 px, plus a **greyscale** screenshot of the slot grid that must stay readable.
- **Lighthouse** (mobile, production build `npm run build && npm start`): meets the budgets above, a11y ≥ 95.
- **After any remote migration:** Supabase MCP `get_advisors` (security + performance) comes back clean.

## CJ actions / pre-launch checklist
- **Now:** nothing. M0 through M5 run fully locally. The local Supabase stack catches auth emails, so signup and password reset can be tested without SMTP.
- **Later:**
  - Google OAuth credentials.
  - Your real GCash QR and bank details, plus Pro prices (entered in admin).
  - Approval to create the remote Supabase project in Singapore.
  - Vercel CLI login.
  - Before charging owners: Vercel Pro + Supabase Pro.
  - Custom SMTP (e.g. Resend) for auth emails, since Supabase's built-in sender is testing-only.
  - A domain.
  - Legal text review.
  - Optionally, Turnstile on signup.
