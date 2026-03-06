'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

export default function SidebarAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (loading) return null;

  if (session) {
    const email = session.user.email;
    return (
      <div className="sidebar-user">
        <div className="email">{email}</div>
        <button onClick={handleSignOut} className="btn-logout">
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="sidebar-user">
      <div className="email" style={{ color: 'rgb(100 116 139)' }}>Not signed in</div>
    </div>
  );
}
