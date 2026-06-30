# Schoolhouse

An open-source homeschool tracker & planner for parents. Track daily attendance,
run a loop schedule per kid, log hours for high-school credit, plan work on
monthly/yearly calendars, record field trips, and keep a per-kid reading log.
Signs in with Google, installs as a PWA on phone or desktop, dark mode included.

See [`PROJECT.md`](./PROJECT.md) for the full plan and roadmap.

## Stack

Vite · React 19 · TypeScript · Tailwind v4 · shadcn/ui · Supabase (Postgres +
Google OAuth + RLS) · PWA · Vercel.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase keys
npm run dev
```

### Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. **Project Settings → API** → copy the Project URL and anon key into `.env.local`.
3. Run the schema: paste `supabase/migrations/0001_init.sql` into the Supabase
   SQL editor (or use the Supabase CLI).
4. **Authentication → Providers → Google** → enable it and add Google OAuth
   credentials from the [Google Cloud Console](https://console.cloud.google.com).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local dev server (HMR) |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview the production build |

## License

[MIT](./LICENSE)
