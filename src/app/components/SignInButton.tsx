'use client';

import { createBrowserClient } from '@supabase/ssr';

export default function SignInButton() {
  const handleLogin = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: false,
      },
    });
  };

  return (
    <button
      onClick={handleLogin}
      className="button"
      style={{ width: '100%', justifyContent: 'center', padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}
    >
      Sign in with Google
    </button>
  );
}
