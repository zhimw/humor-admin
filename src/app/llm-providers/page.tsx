import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireSuperadmin } from '../../lib/supabase/server';
import { Suspense } from 'react';
import DeleteButton from '../images/DeleteButton'; // Reusing DeleteButton
import SavedToast from '../images/SavedToast'; // Reusing SavedToast

const PAGE_SIZE = 50;

// ─── Server actions ───────────────────────────────────────────────────────────

async function updateLlmProvider(formData: FormData) {
  'use server';
  const { supabase, user } = await requireSuperadmin();

  await supabase
    .from('llm_providers')
    .update({
      name: (formData.get('name') as string) || null,
      modified_by_user_id: user.id,
    })
    .eq('id', formData.get('id') as string);

  const page = (formData.get('page') as string) || '1';
  revalidatePath('/llm-providers');
  redirect(`/llm-providers?page=${page}&saved=1`);
}

async function createLlmProvider(formData: FormData) {
  'use server';
  const { supabase, user } = await requireSuperadmin();

  await supabase.from('llm_providers').insert({
    name: (formData.get('name') as string) || null,
    created_by_user_id: user.id,
    modified_by_user_id: user.id,
  });

  revalidatePath('/llm-providers');
  redirect(`/llm-providers?created=1`);
}

async function deleteLlmProvider(formData: FormData) {
  'use server';
  const { supabase } = await requireSuperadmin();
  const providerId = formData.get('id') as string;

  const { error } = await supabase
    .from('llm_providers')
    .delete()
    .eq('id', providerId);

  if (error) {
    // Most likely a foreign-key constraint because there are llm_models referencing this provider.
    console.error('Error deleting LLM provider:', error.message);
    redirect('/llm-providers?error=delete_has_models');
  }

  revalidatePath('/llm-providers');
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LlmProvidersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; edit?: string; create?: string; saved?: string; created?: string; error?: string }>;
}) {
  const { supabase } = await requireSuperadmin();
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10));
  const editId = params.edit ?? null;
  const showCreate = params.create === '1';
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: llmProviders, count } = await supabase
    .from('llm_providers')
    .select('id, name, created_datetime_utc', { count: 'exact' })
    .order('created_datetime_utc', { ascending: false })
    .range(from, to);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  // Fetch edit target if needed
  let editLlmProvider: any = null;
  if (editId) {
    const { data } = await supabase
      .from('llm_providers')
      .select('id, name')
      .eq('id', editId)
      .single();
    editLlmProvider = data;
  }

  const showSavedToast = params.saved === '1' || params.created === '1';
  const errorCode = params.error;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'rgb(248 250 252)' }}>LLM Providers</h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'rgb(148 163 184)' }}>
            {count ?? 0} total · page {page} of {totalPages || 1}
          </p>
        </div>
        <a
          href="/llm-providers?create=1"
          className="button"
          style={{ textDecoration: 'none', fontSize: '0.8rem', padding: '0.45rem 1rem' }}
        >
          + New LLM Provider
        </a>
      </header>

      {/* Error banner for failed deletes */}
      {errorCode === 'delete_has_models' && (
        <div
          className="card"
          style={{
            border: '1px solid rgba(248,113,113,0.4)',
            background: 'rgba(30,64,175,0.25)',
            color: 'rgb(248 250 252)',
            fontSize: '0.8rem',
          }}
        >
          <strong style={{ color: 'rgb(248 113 113)' }}>Cannot delete provider.</strong>{' '}
          This provider is still referenced by one or more LLM models. Please reassign or delete those models first.
        </div>
      )}

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
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'rgb(248 250 252)' }}>New LLM Provider</h2>
              <a href="/llm-providers" style={{ fontSize: '0.8rem', color: 'rgb(148 163 184)' }}>✕ Cancel</a>
            </div>
            <form action={createLlmProvider} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgb(148 163 184)', marginBottom: '0.3rem' }}>
                  Provider Name <span style={{ color: 'rgb(248 113 113)' }}>*</span>
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="e.g., OpenAI"
                  className="input"
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <a
                  href="/llm-providers"
                  style={{ textDecoration: 'none', fontSize: '0.75rem', padding: '0.35rem 0.8rem', borderRadius: '999px', border: '1px solid rgba(148,163,184,0.6)', color: 'rgb(226 232 240)', background: 'rgba(15,23,42,0.85)', display: 'inline-flex', alignItems: 'center' }}
                >
                  Cancel
                </a>
                <button type="submit" className="button" style={{ fontSize: '0.8rem' }}>
                  Create LLM Provider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editLlmProvider && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(2, 6, 23, 0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '32rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'rgb(248 250 252)' }}>Edit LLM Provider</h2>
              <a href="/llm-providers" style={{ fontSize: '0.8rem', color: 'rgb(148 163 184)' }}>✕ Cancel</a>
            </div>
            <form action={updateLlmProvider} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input type="hidden" name="id" value={editLlmProvider.id} />
              <input type="hidden" name="page" value={String(page)} />
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgb(148 163 184)', marginBottom: '0.3rem' }}>Provider Name</label>
                <input name="name" type="text" defaultValue={editLlmProvider.name ?? ''} className="input" />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <a href="/llm-providers" className="button-secondary" style={{ textDecoration: 'none', fontSize: '0.75rem', padding: '0.35rem 0.8rem', borderRadius: '999px', border: '1px solid rgba(148,163,184,0.6)', color: 'rgb(226 232 240)', background: 'rgba(15,23,42,0.85)', display: 'inline-flex', alignItems: 'center' }}>Cancel</a>
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
                <th>Name</th>
                <th>Created At</th>
                <th style={{ width: '7rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!llmProviders || llmProviders.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'rgb(100 116 139)', padding: '2rem' }}>No LLM providers found.</td>
                </tr>
              ) : llmProviders.map((provider: any) => (
                <tr key={provider.id}>
                  <td>{provider.id}</td>
                  <td style={{ maxWidth: '10rem' }}>
                    <div style={{ fontSize: '0.8rem', color: 'rgb(226 232 240)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {provider.name || <span style={{ color: 'rgb(100 116 139)' }}>—</span>}
                    </div>
                  </td>
                  <td style={{ maxWidth: '20rem', fontSize: '0.72rem', color: 'rgb(100 116 139)', whiteSpace: 'nowrap' }}>
                    {provider.created_datetime_utc
                      ? new Date(provider.created_datetime_utc).toLocaleDateString()
                      : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <a
                        href={`/llm-providers?page=${page}&edit=${provider.id}`}
                        style={{ fontSize: '0.72rem', color: 'rgb(56 189 248)', textDecoration: 'none', padding: '0.2rem 0.5rem', border: '1px solid rgba(56,189,248,0.35)', borderRadius: '0.375rem', background: 'rgba(56,189,248,0.08)', whiteSpace: 'nowrap' }}
                      >
                        Edit
                      </a>
                      <DeleteButton id={provider.id} deleteAction={deleteLlmProvider} />
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
              <a href={`/llm-providers?page=${page - 1}`} className="pagination-btn">← Prev</a>
            )}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .map((p, idx, arr) => (
                <span key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && <span style={{ padding: '0 0.25rem', color: 'rgb(100 116 139)' }}>…</span>}
                  <a
                    href={`/llm-providers?page=${p}`}
                    className={`pagination-btn${p === page ? ' pagination-btn-active' : ''}`}
                  >
                    {p}
                  </a>
                </span>
              ))}
            {page < totalPages && (
              <a href={`/llm-providers?page=${page + 1}`} className="pagination-btn">Next →</a>
            )}
          </div>
        </div>
      </div>

      <Suspense><SavedToast /></Suspense>
    </div>
  );
}
