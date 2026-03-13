import { requireSuperadmin } from '../../lib/supabase/server';

const PAGE_SIZE = 50;

export default async function ProfilesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; email?: string }>;
}) {
  const { supabase } = await requireSuperadmin();
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10));
  const emailQuery = (params.email ?? '').trim();
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from('profiles')
    .select('id, first_name, last_name, email, is_superadmin, is_in_study, is_matrix_admin, created_datetime_utc', {
      count: 'exact',
    })
    .order('created_datetime_utc', { ascending: false });

  if (emailQuery) {
    query = query.ilike('email', `%${emailQuery}%`);
  }

  const { data: profiles, count } = await query.range(from, to);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'rgb(248 250 252)' }}>
            Users &amp; Profiles
          </h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'rgb(148 163 184)' }}>
            {count ?? 0} total · page {page} of {totalPages || 1} · read-only directory of all signed-up profiles.
          </p>
        </div>
        <form
          method="GET"
          style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.8rem' }}
        >
          <label style={{ color: 'rgb(148 163 184)' }}>
            <input
              type="text"
              name="email"
              defaultValue={emailQuery}
              placeholder="Filter by email…"
              className="input"
              style={{ maxWidth: '16rem' }}
            />
          </label>
          <button type="submit" className="button-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}>
            Search
          </button>
          {emailQuery && (
            <a
              href="/profiles"
              className="button-secondary"
              style={{
                fontSize: '0.75rem',
                padding: '0.3rem 0.75rem',
                textDecoration: 'none',
              }}
            >
              Clear
            </a>
          )}
        </form>
      </header>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Superadmin</th>
                <th>Matrix Admin</th>
                <th>In Study</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {!profiles || profiles.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'rgb(100 116 139)', padding: '2rem' }}>
                    No profiles found.
                  </td>
                </tr>
              ) : profiles.map((p: any) => (
                <tr key={p.id}>
                  <td style={{ color: 'rgb(226 232 240)', whiteSpace: 'nowrap' }}>
                    {p.first_name || p.last_name
                      ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()
                      : <span style={{ color: 'rgb(100 116 139)' }}>—</span>}
                  </td>
                  <td style={{ color: 'rgb(203 213 225)', fontSize: '0.8rem' }}>{p.email ?? '—'}</td>
                  <td>
                    {p.is_superadmin
                      ? <span className="badge badge-success">Yes</span>
                      : <span style={{ color: 'rgb(100 116 139)', fontSize: '0.75rem' }}>No</span>}
                  </td>
                  <td>
                    {p.is_matrix_admin
                      ? <span className="badge badge-success">Yes</span>
                      : <span style={{ color: 'rgb(100 116 139)', fontSize: '0.75rem' }}>No</span>}
                  </td>
                  <td>
                    {p.is_in_study
                      ? <span className="badge badge-success">Yes</span>
                      : <span style={{ color: 'rgb(100 116 139)', fontSize: '0.75rem' }}>No</span>}
                  </td>
                  <td style={{ color: 'rgb(100 116 139)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    {p.created_datetime_utc
                      ? new Date(p.created_datetime_utc).toLocaleDateString()
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {profiles && profiles.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              borderTop: '1px solid rgba(30,41,59,0.85)',
              fontSize: '0.75rem',
              color: 'rgb(100 116 139)',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <span>
              Showing {from + 1}–{Math.min(to + 1, count ?? 0)} of {count ?? 0}
            </span>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {page > 1 && (
                <a
                  href={`/profiles?page=${page - 1}${emailQuery ? `&email=${encodeURIComponent(emailQuery)}` : ''}`}
                  className="pagination-btn"
                >
                  ← Prev
                </a>
              )}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .map((p, idx, arr) => (
                  <span key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span style={{ color: 'rgb(100 116 139)' }}>…</span>
                    )}
                    <a
                      href={`/profiles?page=${p}${emailQuery ? `&email=${encodeURIComponent(emailQuery)}` : ''}`}
                      className={`pagination-btn${p === page ? ' pagination-btn-active' : ''}`}
                    >
                      {p}
                    </a>
                  </span>
                ))}
              {page < totalPages && (
                <a
                  href={`/profiles?page=${page + 1}${emailQuery ? `&email=${encodeURIComponent(emailQuery)}` : ''}`}
                  className="pagination-btn"
                >
                  Next →
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
