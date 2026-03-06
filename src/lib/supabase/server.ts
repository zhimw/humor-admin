import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored when called from a Server Component
          }
        },
      },
    }
  );
}

export type Profile = {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  is_superadmin: boolean;
};

export type SuperadminContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: { id: string; email?: string };
  profile: Profile;
};

/** Called at the top of every admin CRUD page. Redirects to / if not logged in or not superadmin. */
export async function requireSuperadmin(): Promise<SuperadminContext> {
  let supabase = await createClient();
  let user: { id: string; email?: string } | null = null;

  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    redirect('/');
  }

  if (!user) redirect('/');

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, email, is_superadmin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_superadmin) redirect('/');

  return {
    supabase,
    user: { id: user.id, email: user.email ?? undefined },
    profile,
  };
}
