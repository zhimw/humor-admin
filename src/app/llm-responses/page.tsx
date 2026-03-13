import { requireSuperadmin } from '../../lib/supabase/server';

const PAGE_SIZE = 50;

export default async function LlmResponsesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; query?: string }>;
}) {
  const { supabase } = await requireSuperadmin();
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10));
  const textQuery = (params.query ?? '').trim();
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from('llm_model_responses')
    .select('id, caption_request_id, llm_model_id, humor_flavor_id, llm_model_response, processing_time_seconds, created_datetime_utc', {
      count: 'exact',
    })
    .order('created_datetime_utc', { ascending: false });

  if (textQuery) {
    query = query.ilike('llm_model_response', `%${textQuery}%`);
  }

  const { data: llmResponses, count } = await query.range(from, to);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'rgb(248 250 252)' }}>
            LLM Responses
          </h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'rgb(148 163 184)' }}>
            {count ?? 0} total · page {page} of {totalPages || 1} · read-only list of LLM responses.
          </p>
        </div>
        <form
          method="GET"
          style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.8rem' }}
        >
          <label style={{ color: 'rgb(148 163 184)' }}>
            <input
              type="text"
              name="query"
              defaultValue={textQuery}
              placeholder="Filter by response text…"
              className="input"
              style={{ maxWidth: '16rem' }}
            />
          </label>
          <button type="submit" className="button-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}>
            Search
          </button>
          {textQuery && (
            <a
              href="/llm-responses"
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
                <th>Caption Request ID</th>
                <th>Model ID</th>
                <th>Humor Flavor ID</th>
                <th>Processing Time (s)</th>
                <th>Response Text</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {!llmResponses || llmResponses.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'rgb(100 116 139)', padding: '2rem' }}>
                    No LLM responses found.
                  </td>
                </tr>
              ) : llmResponses.map((response: any) => (
                <tr key={response.id}>
                  <td style={{ color: 'rgb(226 232 240)', whiteSpace: 'nowrap' }}>
                    {response.id}
                  </td>
                  <td style={{ color: 'rgb(226 232 240)', whiteSpace: 'nowrap' }}>
                    {response.caption_request_id || <span style={{ color: 'rgb(100 116 139)' }}>—</span>}
                  </td>
                  <td style={{ color: 'rgb(203 213 225)', fontSize: '0.8rem' }}>{response.llm_model_id ?? '—'}</td>
                  <td style={{ color: 'rgb(203 213 225)', fontSize: '0.8rem' }}>{response.humor_flavor_id ?? '—'}</td>
                  <td style={{ color: 'rgb(203 213 225)', fontSize: '0.8rem' }}>{response.processing_time_seconds ?? '—'}</td>
                  <td style={{ color: 'rgb(203 213 225)', fontSize: '0.8rem' }}>{response.llm_model_response ?? '—'}</td>
                  <td style={{ color: 'rgb(100 116 139)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    {response.created_datetime_utc
                      ? new Date(response.created_datetime_utc).toLocaleDateString()
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {llmResponses && llmResponses.length > 0 && (
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
                  href={`/llm-responses?page=${page - 1}${textQuery ? `&query=${encodeURIComponent(textQuery)}` : ''}`}
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
                      href={`/llm-responses?page=${p}${textQuery ? `&query=${encodeURIComponent(textQuery)}` : ''}`}
                      className={`pagination-btn${p === page ? ' pagination-btn-active' : ''}`}
                    >
                      {p}
                    </a>
                  </span>
                ))}
              {page < totalPages && (
                <a
                  href={`/llm-responses?page=${page + 1}${textQuery ? `&query=${encodeURIComponent(textQuery)}` : ''}`}
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
