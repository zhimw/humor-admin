import { requireSuperadmin } from '../../lib/supabase/server';

export default async function CaptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; public?: string; featured?: string }>;
}) {
  const { supabase } = await requireSuperadmin();
  const params = await searchParams;
  const PAGE_SIZE = 50;
  const page = Math.max(1, parseInt(params.page ?? '1', 10));
  const searchQuery = (params.q ?? '').trim();
  const filterPublic = params.public === '1';
  const filterFeatured = params.featured === '1';
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from('captions')
    .select(
      `id, content, is_public, is_featured, like_count, created_datetime_utc,
       profile_id, humor_flavor_id, llm_prompt_chain_id,
       images!captions_image_id_fkey ( id, url, image_description ),
       profiles!captions_profile_id_fkey ( id, email, first_name, last_name ),
       humor_flavors!captions_humor_flavor_id_fkey ( id, slug, description ),
       llm_prompt_chains!captions_llm_prompt_chain_id_fkey ( id )`,
      { count: 'exact' }
    )
    .order('created_datetime_utc', { ascending: false }) as any;

  if (searchQuery) {
    query = query.ilike('content', `%${searchQuery}%`);
  }
  if (filterPublic) {
    query = query.eq('is_public', true);
  }
  if (filterFeatured) {
    query = query.eq('is_featured', true);
  }

  const { data: captions, count } = await query.range(from, to);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'rgb(248 250 252)' }}>
            Captions
          </h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'rgb(148 163 184)' }}>
            {count ?? 0} total · page {page} of {totalPages || 1} · read-only
          </p>
        </div>
        <form
          method="GET"
          style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.8rem' }}
        >
          <input
            type="text"
            name="q"
            defaultValue={searchQuery}
            placeholder="Filter by caption text…"
            className="input"
            style={{ maxWidth: '20rem' }}
          />
          <label className="pill-toggle">
            <input type="checkbox" name="public" value="1" defaultChecked={filterPublic} />
            Public only
          </label>
          <label className="pill-toggle">
            <input type="checkbox" name="featured" value="1" defaultChecked={filterFeatured} />
            Featured only
          </label>
          <button type="submit" className="button-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}>
            Apply
          </button>
          {(searchQuery || filterPublic || filterFeatured) && (
            <a
              href="/captions"
              className="button-secondary"
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem', textDecoration: 'none' }}
            >
              Clear
            </a>
          )}
        </form>
      </header>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '3.5rem' }}>Image</th>
                <th>Caption content</th>
                <th>Profile</th>
                <th>Likes</th>
                <th>Public</th>
                <th>Featured</th>
                <th>Humor flavor</th>
                <th>LLM chain</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {!captions || captions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'rgb(100 116 139)', padding: '2rem' }}>
                    No captions found.
                  </td>
                </tr>
              ) : captions.map((c: any) => {
                const img = Array.isArray(c.images) ? c.images[0] : c.images;
                const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
                const flavor = Array.isArray(c.humor_flavors) ? c.humor_flavors[0] : c.humor_flavors;
                const chain = Array.isArray(c.llm_prompt_chains) ? c.llm_prompt_chains[0] : c.llm_prompt_chains;

                const displayName =
                  profile && (profile.first_name || profile.last_name)
                    ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim()
                    : profile?.email ?? profile?.id ?? '—';

                return (
                  <tr key={c.id}>
                    <td>
                      {img?.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img.url}
                          alt={img.image_description ?? 'caption image'}
                          title={img.image_description ?? ''}
                          style={{ width: '3rem', height: '2.25rem', objectFit: 'cover', borderRadius: '0.25rem', border: '1px solid rgba(51,65,85,0.9)', display: 'block' }}
                        />
                      ) : (
                        <div style={{ width: '3rem', height: '2.25rem', borderRadius: '0.25rem', background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(51,65,85,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: 'rgb(100 116 139)' }}>
                          None
                        </div>
                      )}
                    </td>
                    <td style={{ maxWidth: '22rem' }}>
                      <div style={{ fontSize: '0.8rem', color: 'rgb(226 232 240)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                        {c.content || <span style={{ color: 'rgb(100 116 139)' }}>—</span>}
                      </div>
                    </td>
                    <td style={{ maxWidth: '12rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'rgb(148 163 184)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {displayName || <span style={{ color: 'rgb(100 116 139)' }}>—</span>}
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className="pill" style={{ gap: '0.3rem' }}>
                        <span style={{ width: '0.45rem', height: '0.45rem', borderRadius: '50%', background: 'rgb(52 211 153)', display: 'inline-block' }} />
                        {c.like_count ?? 0}
                      </span>
                    </td>
                    <td>
                      {c.is_public
                        ? <span className="badge badge-success">Yes</span>
                        : <span className="badge badge-danger">No</span>}
                    </td>
                    <td>
                      {c.is_featured
                        ? <span className="badge badge-success">Yes</span>
                        : <span style={{ color: 'rgb(100 116 139)', fontSize: '0.75rem' }}>No</span>}
                    </td>
                    <td style={{ fontSize: '0.72rem', color: 'rgb(148 163 184)' }}>
                      {flavor
                        ? `${flavor.slug ?? '—'}${flavor.id ? ` (id ${flavor.id})` : ''}`
                        : c.humor_flavor_id ?? <span style={{ color: 'rgb(100 116 139)' }}>—</span>}
                    </td>
                    <td style={{ fontSize: '0.72rem', color: 'rgb(148 163 184)', whiteSpace: 'nowrap' }}>
                      {chain?.id ?? c.llm_prompt_chain_id ?? <span style={{ color: 'rgb(100 116 139)' }}>—</span>}
                    </td>
                    <td style={{ fontSize: '0.72rem', color: 'rgb(100 116 139)', whiteSpace: 'nowrap' }}>
                      {c.created_datetime_utc
                        ? new Date(c.created_datetime_utc).toLocaleDateString()
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderTop: '1px solid rgba(30,41,59,0.85)', fontSize: '0.75rem', color: 'rgb(100 116 139)', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span>
            Showing {from + 1}–{Math.min(to + 1, count ?? 0)} of {count ?? 0}
          </span>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {page > 1 && (
              <a
                href={`/captions?page=${page - 1}${
                  searchQuery || filterPublic || filterFeatured
                    ? `${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}${
                        filterPublic ? '&public=1' : ''
                      }${filterFeatured ? '&featured=1' : ''}`
                    : ''
                }`}
                className="pagination-btn"
              >
                ← Prev
              </a>
            )}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .map((p, idx, arr) => (
                <span key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && <span style={{ color: 'rgb(100 116 139)' }}>…</span>}
                  <a
                    href={`/captions?page=${p}${
                      searchQuery || filterPublic || filterFeatured
                        ? `${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}${
                            filterPublic ? '&public=1' : ''
                          }${filterFeatured ? '&featured=1' : ''}`
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
                href={`/captions?page=${page + 1}${
                  searchQuery || filterPublic || filterFeatured
                    ? `${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}${
                        filterPublic ? '&public=1' : ''
                      }${filterFeatured ? '&featured=1' : ''}`
                    : ''
                }`}
                className="pagination-btn"
              >
                Next →
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
