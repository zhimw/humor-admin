'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

export default function LoginButton() {
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    setRedirectUrl(`${window.location.origin}/auth/callback`);

    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async () => {
    if (!redirectUrl) return;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: false,
      },
    });
  };

  if (loading || session) return null;

  return (
    <button
      onClick={handleLogin}
      className="button"
      disabled={!redirectUrl}
      style={{ width: '100%', justifyContent: 'center', padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}
    >
      Sign in with Google
    </button>
  );
}
