import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireSuperadmin } from '../../lib/supabase/server';
import { Suspense } from 'react';
import DeleteButton from '../images/DeleteButton'; // Reusing DeleteButton for now
import SavedToast from '../images/SavedToast'; // Reusing SavedToast for now

const PAGE_SIZE = 50;

// ─── Server actions ───────────────────────────────────────────────────────────

async function updateTerm(formData: FormData) {
  'use server';
  const { supabase } = await requireSuperadmin();

  await supabase
    .from('terms')
    .update({
      term: (formData.get('term') as string) || null,
      definition: (formData.get('definition') as string) || null,
      example: (formData.get('example') as string) || null,
      priority: formData.get('priority') ? Number(formData.get('priority')) : 0,
    })
    .eq('id', formData.get('id') as string);

  const page = (formData.get('page') as string) || '1';
  revalidatePath('/terms');
  redirect(`/terms?page=${page}&saved=1`);
}

async function createTerm(formData: FormData) {
  'use server';
  const { supabase } = await requireSuperadmin();

  await supabase.from('terms').insert({
    term: (formData.get('term') as string) || null,
    definition: (formData.get('definition') as string) || null,
    example: (formData.get('example') as string) || null,
    priority: formData.get('priority') ? Number(formData.get('priority')) : 0,
  });

  revalidatePath('/terms');
  redirect(`/terms?created=1`); // Redirect after creation, perhaps to the list view
}

async function deleteTerm(formData: FormData) {
  'use server';
  const { supabase } = await requireSuperadmin();
  await supabase.from('terms').delete().eq('id', formData.get('id') as string);
  revalidatePath('/terms');
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TermsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; edit?: string; create?: string; saved?: string; created?: string; q?: string }>;
}) {
  const { supabase } = await requireSuperadmin();
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10));
  const editId = params.edit ?? null;
  const showCreate = params.create === '1';
  const searchQuery = (params.q ?? '').trim();
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from('terms')
    .select('id, term, definition, example, priority, created_datetime_utc, modified_datetime_utc', { count: 'exact' })
    .order('created_datetime_utc', { ascending: false }) as any;

  if (searchQuery) {
    query = query.ilike('term', `%${searchQuery}%`);
  }

  const { data: terms, count } = await query.range(from, to);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  // Fetch edit target if needed
  let editTerm: any = null;
  if (editId) {
    const { data } = await supabase
      .from('terms')
      .select('id, term, definition, example, priority')
      .eq('id', editId)
      .single();
    editTerm = data;
  }

  const showSavedToast = params.saved === '1' || params.created === '1';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'rgb(248 250 252)' }}>Terms</h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'rgb(148 163 184)' }}>
            {count ?? 0} total · page {page} of {totalPages || 1}
          </p>
        </div>
        <a
          href="/terms?create=1"
          className="button"
          style={{ textDecoration: 'none', fontSize: '0.8rem', padding: '0.45rem 1rem' }}
        >
          + New Term
        </a>
      </header>

      {/* Filters */}
      <form
        method="GET"
        style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.8rem' }}
      >
        <input
          type="text"
          name="q"
          defaultValue={searchQuery}
          placeholder="Filter by term…"
          className="input"
          style={{ maxWidth: '20rem' }}
        />
        <button type="submit" className="button-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}>
          Apply
        </button>
        {searchQuery && (
          <a
            href="/terms"
            className="button-secondary"
            style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem', textDecoration: 'none' }}
          >
            Clear
          </a>
        )}
      </form>

      {/* Create modal */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(2, 6, 23, 0.88)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '32rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'rgb(248 250 252)' }}>New Term</h2>
              <a href="/terms" style={{ fontSize: '0.8rem', color: 'rgb(148 163 184)' }}>✕ Cancel</a>
            </div>
            <form action={createTerm} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgb(148 163 184)', marginBottom: '0.3rem' }}>
                  Term Name <span style={{ color: 'rgb(248 113 113)' }}>*</span>
                </label>
                <input
                  name="term"
                  type="text"
                  required
                  placeholder="e.g., Comedy"
                  className="input"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgb(148 163 184)', marginBottom: '0.3rem' }}>Definition</label>
                <textarea name="definition" rows={3} className="input" placeholder="Definition of the term…" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgb(148 163 184)', marginBottom: '0.3rem' }}>Example</label>
                <textarea name="example" rows={3} className="input" placeholder="Example usage…" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgb(148 163 184)', marginBottom: '0.3rem' }}>Priority</label>
                <input
                  name="priority"
                  type="number"
                  min={0}
                  defaultValue={0}
                  className="input"
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <a
                  href="/terms"
                  style={{ textDecoration: 'none', fontSize: '0.75rem', padding: '0.35rem 0.8rem', borderRadius: '999px', border: '1px solid rgba(148,163,184,0.6)', color: 'rgb(226 232 240)', background: 'rgba(15,23,42,0.85)', display: 'inline-flex', alignItems: 'center' }}
                >
                  Cancel
                </a>
                <button type="submit" className="button" style={{ fontSize: '0.8rem' }}>
                  Create Term
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editTerm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(2, 6, 23, 0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '32rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'rgb(248 250 252)' }}>Edit Term</h2>
              <a href="/terms" style={{ fontSize: '0.8rem', color: 'rgb(148 163 184)' }}>✕ Cancel</a>
            </div>
            <form action={updateTerm} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input type="hidden" name="id" value={editTerm.id} />
              <input type="hidden" name="page" value={String(page)} />
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgb(148 163 184)', marginBottom: '0.3rem' }}>Term Name</label>
                <input name="term" type="text" defaultValue={editTerm.term ?? ''} className="input" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgb(148 163 184)', marginBottom: '0.3rem' }}>Definition</label>
                <textarea name="definition" defaultValue={editTerm.definition ?? ''} rows={3} className="input" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgb(148 163 184)', marginBottom: '0.3rem' }}>Example</label>
                <textarea name="example" defaultValue={editTerm.example ?? ''} rows={3} className="input" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgb(148 163 184)', marginBottom: '0.3rem' }}>Priority</label>
                <input
                  name="priority"
                  type="number"
                  min={0}
                  defaultValue={editTerm.priority ?? 0}
                  className="input"
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <a href="/terms" className="button-secondary" style={{ textDecoration: 'none', fontSize: '0.75rem', padding: '0.35rem 0.8rem', borderRadius: '999px', border: '1px solid rgba(148,163,184,0.6)', color: 'rgb(226 232 240)', background: 'rgba(15,23,42,0.85)', display: 'inline-flex', alignItems: 'center' }}>Cancel</a>
                <button type="submit" className="button" style={{ fontSize: '0.8rem' }}>Save changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Term</th>
                <th>Definition</th>
                <th>Example</th>
                <th>Priority</th>
                <th>Created At</th>
                <th>Modified At</th>
                <th style={{ width: '7rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!terms || terms.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'rgb(100 116 139)', padding: '2rem' }}>No terms found.</td>
                </tr>
              ) : terms.map((term: any) => (
                <tr key={term.id}>
                  <td>{term.id}</td>
                  <td style={{ maxWidth: '10rem' }}>
                    <div style={{ fontSize: '0.8rem', color: 'rgb(226 232 240)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {term.term || <span style={{ color: 'rgb(100 116 139)' }}>—</span>}
                    </div>
                  </td>
                  <td style={{ maxWidth: '20rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'rgb(148 163 184)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {term.definition || <span style={{ color: 'rgb(100 116 139)' }}>—</span>}
                    </div>
                  </td>
                  <td style={{ maxWidth: '20rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'rgb(148 163 184)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {term.example || <span style={{ color: 'rgb(100 116 139)' }}>—</span>}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'rgb(148 163 184)', whiteSpace: 'nowrap' }}>
                    {term.priority ?? 0}
                  </td>
                  <td style={{ fontSize: '0.72rem', color: 'rgb(100 116 139)', whiteSpace: 'nowrap' }}>
                    {term.created_datetime_utc
                      ? new Date(term.created_datetime_utc).toLocaleDateString()
                      : '—'}
                  </td>
                  <td style={{ fontSize: '0.72rem', color: 'rgb(100 116 139)', whiteSpace: 'nowrap' }}>
                    {term.modified_datetime_utc
                      ? new Date(term.modified_datetime_utc).toLocaleDateString()
                      : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <a
                        href={`/terms?page=${page}&edit=${term.id}`}
                        style={{ fontSize: '0.72rem', color: 'rgb(56 189 248)', textDecoration: 'none', padding: '0.2rem 0.5rem', border: '1px solid rgba(56,189,248,0.35)', borderRadius: '0.375rem', background: 'rgba(56,189,248,0.08)', whiteSpace: 'nowrap' }}
                      >
                        Edit
                      </a>
                      <DeleteButton id={term.id} deleteAction={deleteTerm} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderTop: '1px solid rgba(30,41,59,0.85)', fontSize: '0.75rem', color: 'rgb(100 116 139)', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span>
            Showing {from + 1}–{Math.min(to + 1, count ?? 0)} of {count ?? 0}
          </span>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {page > 1 && (
              <a
                href={`/terms?page=${page - 1}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}`}
                className="pagination-btn"
              >
                ← Prev
              </a>
            )}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .map((p, idx, arr) => (
                <span key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && <span style={{ padding: '0 0.25rem', color: 'rgb(100 116 139)' }}>…</span>}
                  <a
                    href={`/terms?page=${p}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}`}
                    className={`pagination-btn${p === page ? ' pagination-btn-active' : ''}`}
                  >
                    {p}
                  </a>
                </span>
              ))}
            {page < totalPages && (
              <a
                href={`/terms?page=${page + 1}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}`}
                className="pagination-btn"
              >
                Next →
              </a>
            )}
          </div>
        </div>
      </div>

      <Suspense><SavedToast /></Suspense>
    </div>
  );
}
