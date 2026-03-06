# Humor Admin Panel (Superadmin Only)

This Next.js app provides a **superadmin-only** control panel for the Humor project database. It connects to the same Supabase instance as the main `humor-project` app and exposes read/write tools for a few key tables.

## Features

- **Dashboard** (`/`):
  - Total profiles, images, captions, and studies.
  - Reported images/captions overview.
  - Top liked captions leaderboard.
- **Profiles** (`/profiles`):
  - View recent profiles.
  - Toggle `is_superadmin`, `is_in_study`, and `is_matrix_admin`.
- **Images** (`/images`):
  - Preview recent images.
  - Edit `image_description` and `additional_context`.
  - Toggle `is_common_use` and `is_public`.
- **Captions** (`/captions`):
  - Inline-edit caption text.
  - Toggle `is_public` and `is_featured`.

All pages are guarded with `requireSuperadmin()`, which:

- Uses Supabase auth cookies to look up the current user.
- Fetches their profile from `public.profiles`.
- Enforces `profiles.is_superadmin = TRUE` before any data is read or written.

## Requirements

- Node.js 18+ (Next.js 15-compatible).
- Environment variables (usually via `.env.local`):

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

These should **match** the values used by the main `humor-project` Next.js app.

## Development

From `humor-admin/`:

```bash
pnpm install   # or npm install / yarn
pnpm dev       # or npm run dev
```

Then visit `http://localhost:3000`.

You must log in via the main app (or any route that sets the Supabase session cookie) with a profile that has `is_superadmin = TRUE` to see anything useful in this admin app.

## Bootstrapping the First Superadmin

Because the admin app itself requires `profiles.is_superadmin = TRUE`, you need to **promote at least one profile out-of-band** using a privileged channel (e.g. Supabase SQL editor or a migration that runs with a service role key).

Example one-time SQL (run in Supabase Dashboard, **not** from the frontend):

```sql
update public.profiles
set is_superadmin = true
where email = 'you@example.com';
```

After that:

1. Log in with that email through the main app (Google OAuth).
2. Navigate to the admin app.
3. Use `/profiles` to grant or revoke superadmin for other trusted users.

> Note: Do **not** change or disable any RLS policies from this app. All access is meant to be enforced by Supabase RLS and the authenticated user context.

