# Schoolhouse

> Planning doc — the contract for the project. Cycles ship as feature branches → PRs.

## Vision

Schoolhouse is a homeschool tracker and planner for parents managing one or more
children at home. One place to record daily attendance, run a **loop schedule**
per kid (so you always pick up where you left off), log instructional hours for
high-school credit, plan and review work on monthly and yearly calendars, log
field-trip days, and keep a per-kid book-reading log. It signs in with Google,
works equally well on a phone and a laptop (installable PWA), and is fully open
source. Built for a homeschooling parent who wants to replace a pile of
spreadsheets and paper with one purpose-built app.

## Non-goals

Explicitly **not** building in v1 (prevents scope creep):
- No printable PDF transcripts / report export yet — that's **Cycle 2** (the payoff of hours logging).
- No reminders / push notifications.
- No multi-parent or co-op sharing of a single account.
- No grades / GPA computation or curriculum marketplace.
- No offline write sync — the PWA shell caches, but writes need a connection.
- No native iOS/Android store builds — PWA only.

## Stack

Validated `~/src` defaults plus a managed backend for auth + data.

- **Build:** Vite + React 19 + TypeScript (strict)
- **UI:** Tailwind v4 + shadcn/ui (Radix Nova), `next-themes` for dark mode
- **Data/Auth:** **Supabase** — Postgres + Google OAuth + Row-Level Security
- **Mobile:** installable PWA (`vite-plugin-pwa`) — one codebase, web + phone
- **Routing:** `react-router-dom`
- **Data layer:** `@tanstack/react-query` over `supabase-js` — caching, optimistic updates, no hand-rolled loading state
- **Forms:** `react-hook-form` + `zod` (+ `@hookform/resolvers`) — typed, validated forms for the many entry screens
- **Hosting:** Vercel (SPA rewrite + immutable asset cache)
- **Tests:** Playwright `tests/verify-ui.mjs` (desktop + iPhone viewport)
- **CI:** GitHub Actions — typecheck + build on every PR
- **License:** MIT (open source)

**Why Supabase:** managed (near-zero maintenance), free tier fits a family app,
one-click Google SSO for parents, and RLS enforces per-account data isolation in
the database itself — the safest answer to "never make a user's data public." It
is also open source / self-hostable, satisfying the open-source goal.

## Data model

Every table scoped to the signed-in parent via RLS (`parent_id = auth.uid()`
directly, or through `kid_id → kids.parent_id`). See `supabase/migrations/0001_init.sql`.

```
profiles      (id=auth.uid, email)
  ├─ settings            (parent_id, required_days=180, school_year)  ← mandated-days counter
  └─ kids                (id, parent_id, name, grade, birthdate)      ← age derived
       ├─ attendance     (kid_id, date, status[present|absent|half|field_trip|holiday], counts_as_school_day, notes)
       ├─ loops          (kid_id, name, current_position)             ← parallel loops; pointer = "pick up where we left off"
       │    └─ loop_items(loop_id, subject, position, active)
       │         └─ loop_completions(loop_item_id, date)              ← history feeds reporting
       ├─ courses        (kid_id, name, credit_target_hours, credit_value)  ← HS credit
       │    └─ hours_log (kid_id, course_id?, subject, date, hours, description)
       ├─ books          (kid_id, title, author, started_on, finished_on, status)
       └─ events         (parent_id, kid_id?, date, title, type, notes)  ← calendars
```

Hardened during the ultraplan pass: **multiple loops per kid** (real homeschool
practice), a **loop_completions** history, **courses** so hours roll toward a
credit target (e.g. 87/120 hrs → 0.7 credit), a **settings.required_days** counter
for state-mandated instructional days, **birthdate** instead of a drifting `age`,
and RLS that also verifies kid/course ownership on `events`/`hours_log` inserts.

## Cycles

### Cycle 1 — Full v1 (the whole feature set)

**Theme:** Ship the complete homeschool tracker in one push.

Built in a deliberate order — the foundation (auth + DB + PWA shell) lands first,
then features stack on top.

Build sequencing note: land a **walking skeleton** first — Phase 0 plus a thin
slice of Phase 1 (add one kid) deployed to Vercel — to prove auth + RLS + deploy
end-to-end before stacking the rest. This de-risks without cutting scope.

**Done when:**
- [ ] **Phase 0 — Foundation:** scaffold (done); Supabase schema + RLS applied; Google SSO with protected routes + redirect URLs configured (localhost + Vercel); installable PWA; dark-mode toggle; responsive app shell (bottom tabs on mobile, sidebar on desktop); React Query provider; dev seed script for a fake family.
- [ ] **Phase 1 — Kids:** list, add / edit / remove (name, grade, birthdate→age); kid switcher. Grade drives whether HS-only features (hours/credits) surface.
- [ ] **Phase 2 — Attendance:** fast daily flow to mark the whole family at once (present / absent / half / field-trip / holiday); field-trip days; mandated-days progress counter (days completed / `required_days`).
- [ ] **Phase 3 — Loop:** per-kid loops (≥1); ordered subjects; "next up" view; mark-done logs a completion and advances the loop pointer; reorder + skip.
- [ ] **Phase 4 — Hours:** courses with credit targets; log hours per kid / course / date; per-course progress bar toward credit (hrs → fractional credit); yearly totals.
- [ ] **Phase 5 — Calendar:** monthly grid (add/manage schoolwork & events) + yearly overview as 12 mini-month heatmaps → tap a month to drill in.
- [ ] **Phase 6 — Books:** per-kid reading log (title, author, started/finished, status).
- [ ] **Phase 7 — Polish:** `verify-ui.mjs` passes desktop + mobile; CI green; deployed to Vercel.

**Scope:** all 11 requested features (see Vision).

**Out of scope for this cycle:** see Non-goals.

### Cycle 2 — Reporting & export
**Done when:**
- [ ] Printable / PDF attendance + hours transcripts suitable for submitting to local high schools.

**Scope:**
- Per-kid, per-date-range report builder; print-friendly layout; PDF export.

### Cycle 3+ — backlog
- Reminders / notifications.
- Multi-parent / co-op account sharing.
- Offline-first writes (sync queue).
- CSV import/export of historical records.

## Open questions
- [x] Age vs birthdate → **store birthdate, derive age** (no annual drift). Resolved in schema.
- [x] Loops: single vs multiple per kid → **multiple** (schema supports it; UI can start with one).
- [ ] Field trips: attendance status vs calendar event — schema supports both; confirm the primary entry point in Phase 2/5 so they don't double-count school days.
- [ ] Hours subject: free-text vs linked to a course only — current schema allows both (`course_id?` + free `subject`); decide default UX in Phase 4.
- [ ] Auth testing: seed a dedicated test user (service-role seed) for Playwright, or test only the unauthenticated gate + component states? Decide before Phase 7.

## Risks / unknowns
- Supabase project + Google OAuth credentials require two manual signups only the owner can do (blocks first real login, not the build).
- **Auth-gated E2E testing** is awkward — `verify-ui.mjs` can't click through Google SSO. Mitigation: Supabase local dev + a seeded session, or a test-only email/password path. Flagged for Phase 7.
- Loop-scheduling UX (advance / skip / reorder, multiple loops) is the least conventional feature — most design risk; prototype early in Phase 3.
- OAuth redirect handling inside an installed PWA (standalone display) needs the right `redirectTo` + Supabase allow-list entries; verify on a real install.
- Yearly calendar density on a phone — resolved via the 12 mini-month heatmap drill-in pattern.

---
*Created 2026-06-30. Private ops log: `~/avengers/claude/project-logs/schoolhouse/log.md`*
