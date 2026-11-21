# Courtify M1: landing, For venues and legal pages

Builds on the main spec (`2026-11-21-courtify-design.md`) and the shipped M0 foundation. Where the two disagree, this doc wins for M1.

## Intent

Courtify is one platform with two sides:
- **Players** find and book courts.
- **Venue owners** use Courtify to fill their courts and run their day.

M1 is the public face of that platform. CJ wants it to serve **both sides, weighting owners more**. Owners are the paying customers, and every venue they list is what brings players in.

Nothing deploys until every milestone (M1 to M6) is done. So M1 links to the routes the later milestones fill in (`/courts` in M2, `/owner/new` in M3), not to stand-ins or waitlists.

## Goals
- In the first screen, a player sees how to book and an owner sees "this is for my venue". Neither has to scroll to find their door.
- The owner story is the longest part of the page. It answers what Courtify does for a venue, what it costs, and how to start.
- Prices on the page are the real ones from `platform_settings`, never hard-coded.
- The page feels alive and specific to racket sports, and it's smooth on budget Android phones and in the Facebook and Messenger in-app browsers.
- `/for-venues` is the full owner pitch. `/legal/terms` and `/legal/privacy` are real drafts.

## Non-goals
- A waitlist or lead form. CJ confirmed that owners clicking through to the M3 placeholder is fine.
- Working search (M2) or the venue wizard (M3).
- Dark mode, translations, testimonials, partner logos, stock photography.

## Anti-goals (each counts as a failure even if everything works)
- Motion that stutters on a budget Android phone.
- Anything that looks like a template, such as a generic SaaS hero with three feature cards.
- Claims we can't back: invented stats, fake reviews, fake "trusted by" logos.
- A hero that speaks to only one side.

## Constraints
- **Performance budget (main spec):**
  - LCP under 2.5 s and CLS under 0.05 on the mid-tier mobile throttle.
  - Initial JS around 150 KB gzipped or less.
  - GSAP loads after LCP.
- **Motion rules (main spec):**
  - Animate only transform and opacity.
  - Effects write to CSS variables or GSAP, never React state.
  - Cursor effects only on `(pointer: fine)`.
  - Loops pause when offscreen and when the tab is hidden.
  - With `prefers-reduced-motion`, everything shows its finished state from the same markup, so hydration never mismatches.
- **Type and colour:**
  - Fugaz One only for display text, never below 20px. Work Sans for everything else.
  - Text on clay is always ink.
  - Every text/background pair is at least 4.5:1 (the M0 contrast gate).
- **Cache Components:**
  - Pages are static shells.
  - The header's auth slot already streams inside Suspense.
  - Public data reads use `'use cache'` with a cookie-free Supabase client, because `createServerSupabase` reads cookies and calls `connection()`, so it can't be cached.
- **Accessibility:**
  - Exactly one `h1` per page (the existing e2e test checks the home page).
  - Every interactive element works from the keyboard.
  - The skip link and focus ring stay in place.
- **Links stay inside the app:**
  - Player search submits to `/courts` with `sport`, `city` and `date` in the URL, so M2 reads the same parameters.
  - Owner calls to action go to `/owner/new`. The proxy already sends signed-out visitors to `/login?next=/owner/new`.

## Approaches considered

**Page structure.** CJ picked **B** from browser mockups.
- **A. Players at the door:** player search in the hero, with owners below. Rejected because owners have to scroll past a player hero before they see their door.
- **B. Two sides of the net (picked):** the hero is a top-down court, with players on one side and venues on the other.
- **C. Pick your side:** a switch swaps the whole page between audiences. Rejected because half the content hides behind a control, and it needs more JS on budget phones.

**Motion.** My call: the main spec already chose GSAP.
- **GSAP plus ScrollTrigger, dynamically imported after LCP (picked):**
  - It's proven on low-end devices when it only animates transform and opacity.
  - ScrollTrigger handles the scroll-scrubbed serve.
  - Loading it after LCP keeps it out of the initial-JS budget.
- **Native CSS scroll-driven animations and the Web Animations API:** no library, but scroll timelines are patchy in older Android WebViews and in the FB/Messenger in-app browser, so it would need a second, fallback implementation.
- **Framer Motion:** drives animation through React state (which the spec rules out), and it's heavier for scroll scrubbing.

## The landing page (`/`), top to bottom

**1. Hero: the court.** A top-down court diagram fills the hero, with the net down the middle.
- **Left side, "Play":** a short headline (e.g. "Book a court.") and a compact search that submits to `/courts`:
  - sport is a select read from the `sports` table (cached)
  - city is free text
  - date defaults to today in Manila
- **Right side, "Run your courts":** a short headline (e.g. "Fill your courts.") and the "List your venue" call to action to `/owner/new`. It stays the same for every visitor so the hero remains part of the static shell; signed-in owners already reach their dashboard from the account menu.
- **Motion:** the court lines chalk themselves in, then a ball rallies across the net with a ground shadow that tracks its height, and the headline words land like a bounce.
- **Phones:** the court stands upright, with Play on the top half and Venues on the bottom half.
- **Headings:** one `h1` names both sides (for example "Courtify: book a court, or fill yours"; it may be visually integrated rather than a big banner), and each side's headline is an `h2`.
- **Static first:** the hero renders fully without JS. The headline text is the LCP element, and the court is inline SVG with no image request.

**2. For players.**
- **Sports switcher:** one court diagram re-draws its 16 lines between the six sports (the M0 `COURT_SPECS` were built for exactly this morph), with the sport name and a one-line description.
  - It's a keyboard-accessible set of tabs, so the visitor chooses the sport.
  - It may auto-advance while on screen, and it stops for good once the visitor interacts.
- **How it works:** "Search, pick a slot, play". A scroll-scrubbed serve carries the ball through the three steps.

**3. For owners (the longest section).** A dark espresso "floodlit" band (ink background, chalk text), labelled **Product preview**.
- **Time-of-day strip:** a booking-grid preview whose light shifts from morning to golden hour to floodlights.
- **Dashboard mock:** bookings drop in, a GCash proof gets verified, a check-in happens, and scoreboard-style numbers flip. Every figure in the mock is clearly illustrative, never presented as platform stats.
- **Pain to fix:** short copy that names what owners juggle today (Messenger threads, calls, a notebook, double bookings) and what changes: online bookings with no double booking, GCash proofs checked in one place, front-desk check-in, analytics.

**4. Pricing.**
- **Free listing:** the venue page, call and Messenger buttons, and showing up in search.
- **Pro:** monthly and yearly per venue, a 30-day trial that starts at approval, and a 7-day grace period. It unlocks online booking and the operations tools.
- **Amounts:** read live from `platform_settings` (`pro_monthly_centavos`, `pro_yearly_centavos`, `trial_days`, `grace_days`) through a cached, cookie-free read, and formatted with the M0 money helpers.
  - The cache is tagged `platform-settings`. M5's settings editor revalidates that tag; until then the cache lifetime bounds staleness.
  - The yearly card shows its saving against twelve monthly payments, computed from the same settings, and only when there is one.

**5. Closing call to action.** Both doors again ("Find a court" and "List your venue"), and the ball rolls into the button.

**Real stats (optional band).** Counts of listed venues, cities and sports may appear only when they come from the database and clear a minimum. The builder sets the thresholds; if counts are below them the band renders nothing. With the local seed (10 active venues) it may show; that's fine, because it's real data for that environment.

## `/for-venues`
The long owner page. It reuses the owner section's visual language (floodlit band, product preview) and adds:
- **Feature walkthrough:** the Today board, calendar, check-in, GCash proof verification, analytics, activity log and team roles. This is the main spec's owner surface, described plainly and marked "coming with your venue dashboard" where needed. Nothing here is a fake screenshot of real data.
- **How billing works:** the trial, then the owner paying CJ's GCash or bank account and uploading proof, CJ verifying it, Pro running until its end date, and the grace period. Amounts come live from `platform_settings`.
- **FAQ:** at least these:
  - "Is listing free?"
  - "What happens if Pro lapses?" (the listing stays and existing bookings stay valid)
  - "Do players pay through Courtify?" (no; owners collect at the venue or by GCash)
  - "Can my staff use it?" (roles)
  - "How long does setup take?" (about 15 minutes)
- **Call to action:** "List your venue" to `/owner/new`.

## Legal drafts
Both pages keep the "Draft, not legal advice" marker and gain real, readable content:
- **`/legal/terms`:**
  - what Courtify is (a booking platform; venues collect payment)
  - accounts
  - booking, holds and cancellation (the venue's cutoff applies)
  - venue obligations
  - Pro billing (manual GCash or bank transfer, the trial and grace period)
  - acceptable use, suspension, limitation of liability, governing law (Philippines)
  - contact
- **`/legal/privacy`:** written for RA 10173 (the Data Privacy Act of 2012):
  - the personal information controller, as `[Operator name]` and `[contact email]` placeholders that CJ fills in before launch
  - what's collected (account, phone, bookings, payment proofs, venue data)
  - purposes and lawful basis (consent at signup, contract)
  - who sees what (the venue you book with sees your name and phone; admins)
  - processors (Supabase in Singapore, Vercel)
  - retention
  - data-subject rights (access, correction, erasure, objection, portability; the NPC complaint route)
  - security measures
  - cookies (session only)
  - changes
- **Last updated:** each draft shows a "Last updated" date taken from a constant, not a runtime date.

## Copy and imagery
- **Voice:** plain, warm English with local specifics (₱, GCash, Messenger, city names). Short sentences. No hype words, no invented numbers.
- **Imagery:** Courtify's own art only. Court diagrams, arch-framed court scenes in the style of `scripts/seed-photos.ts`, the clay-ball motif, and chalk lines as dividers. No stock photos.
- **Metadata:** each page gets its own title and description. The landing gets an Open Graph image built from the same court art (static, generated at build time).

## Verification
- **E2E on desktop and mobile:**
  - Both hero doors are visible without scrolling.
  - "Find a court" submits to `/courts` with the chosen parameters in the URL.
  - "List your venue" reaches `/owner/new`, or login with `next` for anonymous visitors.
  - Pricing shows the values in `platform_settings`. Testing that edits show up waits for M5, which adds the editor that revalidates the tag.
  - With reduced motion, every section is in its finished state and no animation runs.
  - Exactly one `h1`, no console errors, and zero web-server errors in the run log (M0 lesson).
- **Unit tests:** price formatting from settings, and the stats band's threshold logic.
- **Budgets checked on a production build:**
  - The initial JS for `/` is measured, and GSAP must not be in the initial chunks.
  - LCP and CLS are measured with Lighthouse (mobile throttle).
  - A short-frame check (no long tasks over 50 ms during the hero animation) runs with 4× CPU throttling.
- **Visual check:** screenshots of desktop and mobile at rest and with reduced motion. They're compared against the anti-goals (template look, contrast, the Fugaz minimum size).

## Left to the builder
- Exact copy, headline wording, and the FAQ answers' final phrasing (within the voice above).
- Motion timings, easings, and the exact choreography of each signature motion, within the motion rules.
- The stats band thresholds and the cache lifetime for the settings read.
- Section spacing, illustration details, and the OG image composition.
- Whether to add an automated accessibility scan (e.g. axe in Playwright).
