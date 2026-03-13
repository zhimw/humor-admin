import { requireSuperadmin } from '../../lib/supabase/server';

const PAGE_SIZE = 50;

export default async function LlmPromptChainsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; caption_request_id?: string }>;
}) {
  const { supabase } = await requireSuperadmin();
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10));
  const captionRequestIdQuery = (params.caption_request_id ?? '').trim();
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from('llm_prompt_chains')
    .select('id, caption_request_id, created_datetime_utc', {
      count: 'exact',
    })
    .order('created_datetime_utc', { ascending: false });

  if (captionRequestIdQuery) {
    query = query.eq('caption_request_id', Number(captionRequestIdQuery));
  }

  const { data: llmPromptChains, count } = await query.range(from, to);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'rgb(248 250 252)' }}>
            LLM Prompt Chains
          </h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'rgb(148 163 184)' }}>
            {count ?? 0} total · page {page} of {totalPages || 1} · read-only list of LLM prompt chains.
          </p>
        </div>
        <form
          method="GET"
          style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.8rem' }}
        >
          <label style={{ color: 'rgb(148 163 184)' }}>
            Caption Request ID:
            <input
              type="text"
              name="caption_request_id"
              defaultValue={captionRequestIdQuery}
              placeholder="Filter by caption request id…"
              className="input"
              style={{ marginLeft: '0.4rem', maxWidth: '16rem' }}
            />
          </label>
          <button type="submit" className="button-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}>
            Search
          </button>
          {captionRequestIdQuery && (
            <a
              href="/llm-prompt-chains"
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
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {!llmPromptChains || llmPromptChains.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'rgb(100 116 139)', padding: '2rem' }}>
                    No LLM prompt chains found.
                  </td>
                </tr>
              ) : llmPromptChains.map((chain: any) => (
                <tr key={chain.id}>
                  <td style={{ color: 'rgb(226 232 240)', whiteSpace: 'nowrap' }}>
                    {chain.id}
                  </td>
                  <td style={{ color: 'rgb(226 232 240)', whiteSpace: 'nowrap' }}>
                    {chain.caption_request_id || <span style={{ color: 'rgb(100 116 139)' }}>—</span>}
                  </td>
                  <td style={{ color: 'rgb(100 116 139)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    {chain.created_datetime_utc
                      ? new Date(chain.created_datetime_utc).toLocaleDateString()
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {llmPromptChains && llmPromptChains.length > 0 && (
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
                <a href={`/llm-prompt-chains?page=${page - 1}`} className="pagination-btn">
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
                      href={`/llm-prompt-chains?page=${p}`}
                      className={`pagination-btn${p === page ? ' pagination-btn-active' : ''}`}
                    >
                      {p}
                    </a>
                  </span>
                ))}
              {page < totalPages && (
                <a href={`/llm-prompt-chains?page=${page + 1}`} className="pagination-btn">
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
