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
- **Hosting:** Vercel (SPA rewrite + immutable asset cache)
- **Tests:** Playwright `tests/verify-ui.mjs` (desktop + iPhone viewport)
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
  └─ kids                (id, parent_id, name, grade, age)
       ├─ attendance     (kid_id, date, status[present|absent|half|field_trip], notes)
       ├─ loop_items     (kid_id, subject, position, active)
       │    └─ loop_state(kid_id, current_position)   ← "pick up where we left off"
       ├─ hours_log      (kid_id, subject, date, hours, description)
       ├─ books          (kid_id, title, author, started_on, finished_on, status)
       └─ events         (parent_id, kid_id?, date, title, type, notes)  ← calendars
```

## Cycles

### Cycle 1 — Full v1 (the whole feature set)

**Theme:** Ship the complete homeschool tracker in one push.

Built in a deliberate order — the foundation (auth + DB + PWA shell) lands first,
then features stack on top.

**Done when:**
- [ ] **Phase 0 — Foundation:** Vite+React+TS+Tailwind+shadcn scaffold; Supabase schema + RLS applied; Google SSO with protected routes; installable PWA; dark-mode toggle; responsive app shell (bottom tabs on mobile, sidebar on desktop).
- [ ] **Phase 1 — Kids:** list, add / edit / remove (name, grade, age); kid switcher.
- [ ] **Phase 2 — Attendance:** fast daily flow to mark each kid present / absent / half / field-trip; field-trip days captured.
- [ ] **Phase 3 — Loop:** per-kid ordered subjects; "next up" view; mark-done advances the loop pointer.
- [ ] **Phase 4 — Hours:** log hours per kid / subject / date; running totals for HS credit.
- [ ] **Phase 5 — Calendar:** monthly grid + yearly overview; add / manage schoolwork & events.
- [ ] **Phase 6 — Books:** per-kid reading log (title, author, started/finished, status).
- [ ] **Phase 7 — Polish:** `verify-ui.mjs` passes desktop + mobile; deployed to Vercel.

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
- [ ] Track kid age as a stored number or derive from a birthdate? (currently stored `age int` — revisit if it drifts.)
- [ ] Should field trips be modeled only as an attendance status, only as a calendar event, or both? (current schema supports both — confirm UX in Phase 2/5.)
- [ ] Hours: free-text subject vs. linking to the kid's `loop_items` subjects for consistency.

## Risks / unknowns
- Supabase project + Google OAuth credentials require two manual signups only the owner can do.
- Loop-scheduling UX (advance / skip / reorder) is the least conventional feature — most design risk.
- Yearly calendar at-a-glance density on a phone screen needs care.

---
*Created 2026-06-30. Private ops log: `~/avengers/claude/project-logs/schoolhouse/log.md`*
