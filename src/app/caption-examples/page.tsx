import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireSuperadmin } from '../../lib/supabase/server';
import { Suspense } from 'react';
import DeleteButton from '../images/DeleteButton'; // Reusing DeleteButton
import SavedToast from '../images/SavedToast'; // Reusing SavedToast

const PAGE_SIZE = 50;

// ─── Server actions ───────────────────────────────────────────────────────────

async function updateCaptionExample(formData: FormData) {
  'use server';
  const { supabase, user } = await requireSuperadmin();

  await supabase
    .from('caption_examples')
    .update({
      image_description: (formData.get('image_description') as string) || null,
      caption: (formData.get('caption') as string) || null,
      explanation: (formData.get('explanation') as string) || null,
      priority: formData.get('priority') ? Number(formData.get('priority')) : 0,
      image_id: (formData.get('image_id') as string) || null,
      modified_by_user_id: user.id,
    })
    .eq('id', formData.get('id') as string);

  const page = (formData.get('page') as string) || '1';
  revalidatePath('/caption-examples');
  redirect(`/caption-examples?page=${page}&saved=1`);
}

async function createCaptionExample(formData: FormData) {
  'use server';
  const { supabase, user } = await requireSuperadmin();

  await supabase.from('caption_examples').insert({
    image_description: (formData.get('image_description') as string) || null,
    caption: (formData.get('caption') as string) || null,
    explanation: (formData.get('explanation') as string) || null,
    priority: formData.get('priority') ? Number(formData.get('priority')) : 0,
    image_id: (formData.get('image_id') as string) || null,
    created_by_user_id: user.id,
    modified_by_user_id: user.id,
  });

  revalidatePath('/caption-examples');
  redirect(`/caption-examples?created=1`);
}

async function deleteCaptionExample(formData: FormData) {
  'use server';
  const { supabase } = await requireSuperadmin();
  await supabase.from('caption_examples').delete().eq('id', formData.get('id') as string);
  revalidatePath('/caption-examples');
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CaptionExamplesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    edit?: string;
    create?: string;
    saved?: string;
    created?: string;
    q?: string;
    image_id?: string;
  }>;
}) {
  const { supabase } = await requireSuperadmin();
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10));
  const editId = params.edit ?? null;
  const showCreate = params.create === '1';
  const searchQuery = (params.q ?? '').trim();
  const imageIdQuery = (params.image_id ?? '').trim();
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from('caption_examples')
    .select(
      'id, image_description, caption, explanation, priority, image_id, created_datetime_utc, modified_datetime_utc',
      { count: 'exact' },
    )
    .order('created_datetime_utc', { ascending: false }) as any;

  if (searchQuery) {
    query = query.ilike('caption', `%${searchQuery}%`);
  }
  if (imageIdQuery) {
    query = query.eq('image_id', imageIdQuery);
  }

  const { data: captionExamples, count } = await query.range(from, to);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  // Fetch edit target if needed
  let editCaptionExample: any = null;
  if (editId) {
    const { data } = await supabase
      .from('caption_examples')
      .select('id, image_description, caption, explanation, priority, image_id')
      .eq('id', editId)
      .single();
    editCaptionExample = data;
  }

  const showSavedToast = params.saved === '1' || params.created === '1';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'rgb(248 250 252)' }}>Caption Examples</h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'rgb(148 163 184)' }}>
            {count ?? 0} total · page {page} of {totalPages || 1}
          </p>
        </div>
        <a
          href="/caption-examples?create=1"
          className="button"
          style={{ textDecoration: 'none', fontSize: '0.8rem', padding: '0.45rem 1rem' }}
        >
          + New Caption Example
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
          placeholder="Filter by caption text…"
          className="input"
          style={{ maxWidth: '20rem' }}
        />
        <input
          type="text"
          name="image_id"
          defaultValue={imageIdQuery}
          placeholder="Filter by image id…"
          className="input"
          style={{ maxWidth: '16rem' }}
        />
        <button type="submit" className="button-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}>
          Apply
        </button>
        {(searchQuery || imageIdQuery) && (
          <a
            href="/caption-examples"
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
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'rgb(248 250 252)' }}>New Caption Example</h2>
              <a href="/caption-examples" style={{ fontSize: '0.8rem', color: 'rgb(148 163 184)' }}>✕ Cancel</a>
            </div>
            <form action={createCaptionExample} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgb(148 163 184)', marginBottom: '0.3rem' }}>
                  Image Description <span style={{ color: 'rgb(248 113 113)' }}>*</span>
                </label>
                <textarea
                  name="image_description"
                  required
                  rows={3}
                  placeholder="Describe the example image…"
                  className="input"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgb(148 163 184)', marginBottom: '0.3rem' }}>
                  Caption <span style={{ color: 'rgb(248 113 113)' }}>*</span>
                </label>
                <textarea
                  name="caption"
                  required
                  rows={3}
                  placeholder="e.g., A funny caption for the image…"
                  className="input"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgb(148 163 184)', marginBottom: '0.3rem' }}>
                  Explanation
                </label>
                <textarea
                  name="explanation"
                  rows={3}
                  placeholder="Why this caption works…"
                  className="input"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgb(148 163 184)', marginBottom: '0.3rem' }}>
                  Priority
                </label>
                <input
                  name="priority"
                  type="number"
                  min={0}
                  defaultValue={0}
                  className="input"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgb(148 163 184)', marginBottom: '0.3rem' }}>
                  Image ID
                </label>
                <input
                  name="image_id"
                  type="text"
                  placeholder="e.g., uuid-of-image"
                  className="input"
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <a
                  href="/caption-examples"
                  style={{ textDecoration: 'none', fontSize: '0.75rem', padding: '0.35rem 0.8rem', borderRadius: '999px', border: '1px solid rgba(148,163,184,0.6)', color: 'rgb(226 232 240)', background: 'rgba(15,23,42,0.85)', display: 'inline-flex', alignItems: 'center' }}
                >
                  Cancel
                </a>
                <button type="submit" className="button" style={{ fontSize: '0.8rem' }}>
                  Create Caption Example
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editCaptionExample && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(2, 6, 23, 0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '32rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'rgb(248 250 252)' }}>Edit Caption Example</h2>
              <a href="/caption-examples" style={{ fontSize: '0.8rem', color: 'rgb(148 163 184)' }}>✕ Cancel</a>
            </div>
            <form action={updateCaptionExample} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input type="hidden" name="id" value={editCaptionExample.id} />
              <input type="hidden" name="page" value={String(page)} />
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgb(148 163 184)', marginBottom: '0.3rem' }}>Image Description</label>
                <textarea name="image_description" defaultValue={editCaptionExample.image_description ?? ''} rows={3} className="input" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgb(148 163 184)', marginBottom: '0.3rem' }}>Caption</label>
                <textarea name="caption" defaultValue={editCaptionExample.caption ?? ''} rows={3} className="input" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgb(148 163 184)', marginBottom: '0.3rem' }}>Explanation</label>
                <textarea name="explanation" defaultValue={editCaptionExample.explanation ?? ''} rows={3} className="input" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgb(148 163 184)', marginBottom: '0.3rem' }}>Priority</label>
                <input
                  name="priority"
                  type="number"
                  min={0}
                  defaultValue={editCaptionExample.priority ?? 0}
                  className="input"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgb(148 163 184)', marginBottom: '0.3rem' }}>Image ID</label>
                <input name="image_id" type="text" defaultValue={editCaptionExample.image_id ?? ''} className="input" />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <a href="/caption-examples" className="button-secondary" style={{ textDecoration: 'none', fontSize: '0.75rem', padding: '0.35rem 0.8rem', borderRadius: '999px', border: '1px solid rgba(148,163,184,0.6)', color: 'rgb(226 232 240)', background: 'rgba(15,23,42,0.85)', display: 'inline-flex', alignItems: 'center' }}>Cancel</a>
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
                <th>Image Description</th>
                <th>Caption</th>
                <th>Explanation</th>
                <th>Priority</th>
                <th>Image ID</th>
                <th>Created At</th>
                <th>Updated At</th>
                <th style={{ width: '7rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!captionExamples || captionExamples.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'rgb(100 116 139)', padding: '2rem' }}>No caption examples found.</td>
                </tr>
              ) : captionExamples.map((example: any) => (
                <tr key={example.id}>
                  <td>{example.id}</td>
                  <td style={{ maxWidth: '20rem' }}>
                    <div style={{ fontSize: '0.8rem', color: 'rgb(226 232 240)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                      {example.image_description || <span style={{ color: 'rgb(100 116 139)' }}>—</span>}
                    </div>
                  </td>
                  <td style={{ maxWidth: '20rem' }}>
                    <div style={{ fontSize: '0.8rem', color: 'rgb(226 232 240)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                      {example.caption || <span style={{ color: 'rgb(100 116 139)' }}>—</span>}
                    </div>
                  </td>
                  <td style={{ maxWidth: '20rem' }}>
                    <div style={{ fontSize: '0.8rem', color: 'rgb(226 232 240)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                      {example.explanation || <span style={{ color: 'rgb(100 116 139)' }}>—</span>}
                    </div>
                  </td>
                  <td style={{ maxWidth: '10rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'rgb(148 163 184)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {example.image_id || <span style={{ color: 'rgb(100 116 139)' }}>—</span>}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.72rem', color: 'rgb(148 163 184)', whiteSpace: 'nowrap' }}>
                    {example.priority ?? 0}
                  </td>
                  <td style={{ fontSize: '0.72rem', color: 'rgb(100 116 139)', whiteSpace: 'nowrap' }}>
                    {example.created_datetime_utc
                      ? new Date(example.created_datetime_utc).toLocaleDateString()
                      : '—'}
                  </td>
                  <td style={{ fontSize: '0.72rem', color: 'rgb(100 116 139)', whiteSpace: 'nowrap' }}>
                    {example.modified_datetime_utc
                      ? new Date(example.modified_datetime_utc).toLocaleDateString()
                      : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <a
                        href={`/caption-examples?page=${page}&edit=${example.id}`}
                        style={{ fontSize: '0.72rem', color: 'rgb(56 189 248)', textDecoration: 'none', padding: '0.2rem 0.5rem', border: '1px solid rgba(56,189,248,0.35)', borderRadius: '0.375rem', background: 'rgba(56,189,248,0.08)', whiteSpace: 'nowrap' }}
                      >
                        Edit
                      </a>
                      <DeleteButton id={example.id} deleteAction={deleteCaptionExample} />
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
                href={`/caption-examples?page=${page - 1}${
                  searchQuery || imageIdQuery
                    ? `${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}${
                        imageIdQuery ? `&image_id=${encodeURIComponent(imageIdQuery)}` : ''
                      }`
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
                <span key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && <span style={{ padding: '0 0.25rem', color: 'rgb(100 116 139)' }}>…</span>}
                  <a
                    href={`/caption-examples?page=${p}${
                      searchQuery || imageIdQuery
                        ? `${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}${
                            imageIdQuery ? `&image_id=${encodeURIComponent(imageIdQuery)}` : ''
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
                href={`/caption-examples?page=${page + 1}${
                  searchQuery || imageIdQuery
                    ? `${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}${
                        imageIdQuery ? `&image_id=${encodeURIComponent(imageIdQuery)}` : ''
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
      </div>

      <Suspense><SavedToast /></Suspense>
    </div>
  );
}
