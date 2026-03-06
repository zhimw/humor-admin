import { requireSuperadmin } from '../../lib/supabase/server';

export default async function ProfilesPage() {
  const { supabase } = await requireSuperadmin();

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, is_superadmin, is_in_study, is_matrix_admin, created_datetime_utc')
    .order('created_datetime_utc', { ascending: false })
    .limit(200);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <header>
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'rgb(248 250 252)' }}>
          Users &amp; Profiles
        </h1>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'rgb(148 163 184)' }}>
          Read-only directory of all signed-up profiles.
        </p>
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
        {profiles && profiles.length > 0 && (
          <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid rgba(30,41,59,0.85)', fontSize: '0.75rem', color: 'rgb(100 116 139)' }}>
            {profiles.length} profile{profiles.length !== 1 ? 's' : ''} shown
          </div>
        )}
      </div>
    </div>
  );
}
