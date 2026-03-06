#Agents – Humor Admin Guidelines

This document explains how AI agents should work on the `humor-admin` app.

## Core Principles

- **Never weaken security**
  - Do **not** add any routes or logic that bypass the superadmin gate.
  - All admin routes must continue to use `requireSuperadmin()` from `src/lib/supabase/server.ts`.
  - Do **not** introduce service-role keys or any secret keys into client-side code.

- **Respect RLS**
  - Do **not** enable, disable, or modify Supabase Row Level Security (RLS) policies from this app.
  - Assume RLS is the primary enforcement layer; only issue standard `select` / `insert` / `update` / `delete` operations through the existing Supabase client.

- **Single source of truth for auth**
  - When adding new routes, always import and call `requireSuperadmin()` at the top-level of the page or server action before touching data.
  - If you add helper functions that need auth context, pass in the `supabase` instance returned by `requireSuperadmin()` instead of creating their own clients.

## When Adding New Admin Features

- **New pages / routes**
  - Place new admin pages under `src/app/` (e.g. `/studies`, `/reports`).
  - At the top of each page component:
    - `const { supabase, user, profile } = await requireSuperadmin();`
  - Use server components and server actions where possible for data mutations.

- **New stats or dashboards**
  - Prefer `select(..., { count: 'exact', head: true })` for cheap counts when appropriate.
  - Be mindful of performance: use pagination or limits for large tables.
  - Keep heavy analytics read-only unless explicitly requested.

- **Mutations (CRUD)**
  - Use Next.js server actions with `'use server'` and always call `requireSuperadmin()` inside the action.
  - After a write, use `revalidatePath()` for any routes that depend on that data.
  - Do not create generic “run arbitrary SQL” endpoints.

## UX / UI Conventions

- Reuse existing utility classes from `globals.css`:
  - Layout: `card`, `card-muted`, `stat-grid`, `section-title`, `section-header`.
  - Status: `badge`, `badge-success`, `badge-danger`, `pill`, `pill-toggle`.
  - Forms: `input`, `button`, `button-secondary`, `button-danger`, `table`.
- Keep the admin UI:
  - **Readable**: clear labels and concise descriptions.
  - **Safe by default**: destructive actions should be explicit and, when reasonable, require confirmation.

## Environment & Config

- Reuse the same environment variables as the main app:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Do not introduce new env vars that expose privileged Supabase keys.

## Bootstrapping & Testing Notes

- For local or staging setup:
  - Assume at least one profile has been promoted to `is_superadmin = TRUE` via the Supabase SQL editor or a migration (outside this app).
  - Use that account to access the admin area and manage further superadmins via `/profiles`.
- When writing tests or seed scripts, do **not** alter production RLS; focus on creating valid demo data and a known superadmin user.

Following these guidelines will keep the admin panel powerful for operators but safe for the staging/production environment.

