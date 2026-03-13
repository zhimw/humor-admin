import { requireSuperadmin } from '../../lib/supabase/server';

const PAGE_SIZE = 50;

export default async function CaptionRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; image_id?: string; profile_id?: string }>;
}) {
  const { supabase } = await requireSuperadmin();
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10));
  const imageIdQuery = (params.image_id ?? '').trim();
  const profileIdQuery = (params.profile_id ?? '').trim();
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from('caption_requests')
    .select('id, image_id, profile_id, created_datetime_utc', {
      count: 'exact',
    })
    .order('created_datetime_utc', { ascending: false });

  if (imageIdQuery) {
    query = query.eq('image_id', imageIdQuery);
  }
  if (profileIdQuery) {
    query = query.eq('profile_id', profileIdQuery);
  }

  const { data: captionRequests, count } = await query.range(from, to);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'rgb(248 250 252)' }}>
            Caption Requests
          </h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'rgb(148 163 184)' }}>
            {count ?? 0} total · page {page} of {totalPages || 1} · read-only list of caption requests.
          </p>
        </div>
        <form
          method="GET"
          style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.8rem' }}
        >
          <label style={{ color: 'rgb(148 163 184)' }}>
            <input
              type="text"
              name="image_id"
              defaultValue={imageIdQuery}
              placeholder="Filter by image id…"
              className="input"
              style={{ maxWidth: '16rem' }}
            />
          </label>
          <label style={{ color: 'rgb(148 163 184)' }}>
            <input
              type="text"
              name="profile_id"
              defaultValue={profileIdQuery}
              placeholder="Filter by profile id…"
              className="input"
              style={{ maxWidth: '16rem' }}
            />
          </label>
          <button type="submit" className="button-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}>
            Search
          </button>
          {(imageIdQuery || profileIdQuery) && (
            <a
              href="/caption-requests"
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
                <th>ID</th>
                <th>Image ID</th>
                <th>Profile ID</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {!captionRequests || captionRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'rgb(100 116 139)', padding: '2rem' }}>
                    No caption requests found.
                  </td>
                </tr>
              ) : captionRequests.map((request: any) => (
                <tr key={request.id}>
                  <td style={{ color: 'rgb(226 232 240)', whiteSpace: 'nowrap' }}>
                    {request.id}
                  </td>
                  <td style={{ color: 'rgb(226 232 240)', whiteSpace: 'nowrap' }}>
                    {request.image_id || <span style={{ color: 'rgb(100 116 139)' }}>—</span>}
                  </td>
                  <td style={{ color: 'rgb(203 213 225)', fontSize: '0.8rem' }}>{request.profile_id ?? '—'}</td>
                  <td style={{ color: 'rgb(100 116 139)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    {request.created_datetime_utc
                      ? new Date(request.created_datetime_utc).toLocaleDateString()
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {captionRequests && captionRequests.length > 0 && (
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
                  href={`/caption-requests?page=${page - 1}${
                    imageIdQuery || profileIdQuery
                      ? `${imageIdQuery ? `&image_id=${encodeURIComponent(imageIdQuery)}` : ''}${
                          profileIdQuery ? `&profile_id=${encodeURIComponent(profileIdQuery)}` : ''
                        }`
                      : ''
                  }`}
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
                      href={`/caption-requests?page=${p}${
                        imageIdQuery || profileIdQuery
                          ? `${imageIdQuery ? `&image_id=${encodeURIComponent(imageIdQuery)}` : ''}${
                              profileIdQuery ? `&profile_id=${encodeURIComponent(profileIdQuery)}` : ''
                            }`
                          : ''
                      }`}
                      className={`pagination-btn${p === page ? ' pagination-btn-active' : ''}`}
                    >
                      {p}
                    </a>
                  </span>
                ))}
              {page < totalPages && (
                <a
                  href={`/caption-requests?page=${page + 1}${
                    imageIdQuery || profileIdQuery
                      ? `${imageIdQuery ? `&image_id=${encodeURIComponent(imageIdQuery)}` : ''}${
                          profileIdQuery ? `&profile_id=${encodeURIComponent(profileIdQuery)}` : ''
                        }`
                      : ''
                  }`}
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
