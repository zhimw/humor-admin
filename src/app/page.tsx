import { createClient, type Profile } from '../lib/supabase/server';

// ─── Sub-views ────────────────────────────────────────────────────────────────

function LoginView() {
  return (
    <div className="login-page">
      <div className="auth-card">
        <div style={{ fontSize: '2rem' }}>🔐</div>
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'rgb(248 250 252)' }}>
          Sign in required
        </h1>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(148 163 184)', lineHeight: 1.6 }}>
          Sign in with your Google account to access the Humor Admin panel.
        </p>
        <a href="/api/auth/signin" className="signin-link">
          Sign in with Google
        </a>
      </div>
    </div>
  );
}

function AccessDeniedView({ email }: { email?: string }) {
  return (
    <div className="login-page">
      <div className="auth-card">
        <div style={{ fontSize: '2rem' }}>🚫</div>
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'rgb(248 250 252)' }}>
          Access denied
        </h1>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(148 163 184)', lineHeight: 1.6 }}>
          Signed in as <strong style={{ color: 'rgb(226 232 240)' }}>{email ?? 'unknown'}</strong>,
          but this account does not have superadmin access.
          Ask an existing superadmin to set{' '}
          <code style={{ color: 'rgb(148 163 184)', fontSize: '0.8rem' }}>profiles.is_superadmin = TRUE</code>.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="button-secondary">Sign out</button>
          </form>
          <a href="/api/auth/signin" className="signin-link">
            Sign in with a different account
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard stats ───────────────────────────────────────────────────────────

async function getDashboardStats(supabase: Awaited<ReturnType<typeof createClient>>) {
  const [profiles, images, captions, reportedImages, reportedCaptions, studies, topCaptions] =
    await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('images').select('id', { count: 'exact', head: true }),
      supabase.from('captions').select('id', { count: 'exact', head: true }),
      supabase.from('reported_images').select('id', { count: 'exact', head: true }),
      supabase.from('reported_captions').select('id', { count: 'exact', head: true }),
      supabase.from('studies').select('id', { count: 'exact', head: true }),
      supabase.from('captions').select('id, content, like_count').order('like_count', { ascending: false }).limit(5),
    ]);

  return {
    profiles: profiles.count ?? 0,
    images: images.count ?? 0,
    captions: captions.count ?? 0,
    reportedImages: reportedImages.count ?? 0,
    reportedCaptions: reportedCaptions.count ?? 0,
    studies: studies.count ?? 0,
    topCaptions: topCaptions.data ?? [],
  };
}

async function DashboardView({ profile, supabase }: { profile: Profile; supabase: Awaited<ReturnType<typeof createClient>> }) {
  const stats = await getDashboardStats(supabase);
  const moderationLoad = stats.reportedImages + stats.reportedCaptions;
  const displayName =
    profile.first_name || profile.last_name
      ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim()
      : profile.email ?? 'Superadmin';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'rgb(248 250 252)' }}>
            Welcome back, {displayName}.
          </h1>
          <p style={{ marginTop: '0.25rem', fontSize: '0.875rem', color: 'rgb(148 163 184)' }}>
            Superadmin access verified — <code style={{ color: 'rgb(226 232 240)' }}>profiles.is_superadmin = TRUE</code>.
          </p>
        </div>
        <span className="badge badge-success">Superadmin</span>
      </header>

      {/* Stat tiles */}
      <section className="card-muted">
        <div className="section-header">
          <h2 className="section-title">Platform pulse</h2>
        </div>
        <div className="stat-grid">
          {[
            { label: 'Total users', value: stats.profiles, note: 'Signed-up profiles' },
            { label: 'Images uploaded', value: stats.images, note: 'Raw material for jokes' },
            { label: 'Captions generated', value: stats.captions, note: 'AI jokes produced so far' },
            { label: 'Active studies', value: stats.studies, note: 'Live research experiments' },
          ].map((s) => (
            <div key={s.label} className="card">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value.toLocaleString()}</div>
              <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'rgb(100 116 139)' }}>{s.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Moderation + top captions */}
      <section style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <div className="card">
          <div className="section-header">
            <h2 className="section-title">Moderation radar</h2>
            <span className={moderationLoad > 0 ? 'badge badge-danger' : 'badge badge-success'}>
              {moderationLoad > 0 ? 'Needs review' : 'All clear'}
            </span>
          </div>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', listStyle: 'none', padding: 0, margin: 0, fontSize: '0.875rem' }}>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgb(203 213 225)' }}>Reported images</span>
              <span className="pill"><span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: 'rgb(251 191 36)', display: 'inline-block' }} />{stats.reportedImages}</span>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgb(203 213 225)' }}>Reported captions</span>
              <span className="pill"><span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: 'rgb(248 113 113)', display: 'inline-block' }} />{stats.reportedCaptions}</span>
            </li>
          </ul>
        </div>

        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="section-header">
            <h2 className="section-title">Top liked captions</h2>
          </div>
          {stats.topCaptions.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: 'rgb(100 116 139)' }}>No captions yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {stats.topCaptions.map((c: any, i: number) => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', borderBottom: '1px solid rgba(30,41,59,0.85)', paddingBottom: '0.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.7rem', color: 'rgb(100 116 139)', marginBottom: '0.2rem' }}>#{i + 1}</div>
                    <p style={{ fontSize: '0.875rem', color: 'rgb(226 232 240)', margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{c.content}</p>
                  </div>
                  <span className="pill" style={{ whiteSpace: 'nowrap' }}>
                    <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: 'rgb(52 211 153)', display: 'inline-block' }} />
                    {c.like_count ?? 0} likes
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ─── Root page ─────────────────────────────────────────────────────────────────

export default async function AdminRoot() {
  let user: { id: string; email?: string } | null = null;

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Auth error (e.g. stale refresh token) — treat as logged out
    return <LoginView />;
  }

  if (!user) {
    return <LoginView />;
  }

  // Re-create client for the rest of the page (safe now that getUser succeeded)
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, email, is_superadmin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_superadmin) {
    return <AccessDeniedView email={user.email} />;
  }

  return <DashboardView profile={profile} supabase={supabase} />;
}
