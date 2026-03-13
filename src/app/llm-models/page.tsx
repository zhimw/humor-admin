import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireSuperadmin } from '../../lib/supabase/server';
import { Suspense } from 'react';
import DeleteButton from '../images/DeleteButton'; // Reusing DeleteButton
import SavedToast from '../images/SavedToast'; // Reusing SavedToast

const PAGE_SIZE = 50;

// ─── Server actions ───────────────────────────────────────────────────────────

async function updateLlmModel(formData: FormData) {
  'use server';
  const { supabase } = await requireSuperadmin();

  await supabase
    .from('llm_models')
    .update({
      name: (formData.get('name') as string) || null,
      llm_provider_id: formData.get('llm_provider_id') ? Number(formData.get('llm_provider_id')) : null,
      provider_model_id: (formData.get('provider_model_id') as string) || null,
      is_temperature_supported: formData.getAll('is_temperature_supported').includes('true'),
    })
    .eq('id', formData.get('id') as string);

  const page = (formData.get('page') as string) || '1';
  revalidatePath('/llm-models');
  redirect(`/llm-models?page=${page}&saved=1`);
}

async function createLlmModel(formData: FormData) {
  'use server';
  const { supabase } = await requireSuperadmin();

  await supabase.from('llm_models').insert({
    name: (formData.get('name') as string) || null,
    llm_provider_id: formData.get('llm_provider_id') ? Number(formData.get('llm_provider_id')) : null,
    provider_model_id: (formData.get('provider_model_id') as string) || null,
    is_temperature_supported: formData.getAll('is_temperature_supported').includes('true'),
  });

  revalidatePath('/llm-models');
  redirect(`/llm-models?created=1`);
}

async function deleteLlmModel(formData: FormData) {
  'use server';
  const { supabase } = await requireSuperadmin();
  await supabase.from('llm_models').delete().eq('id', formData.get('id') as string);
  revalidatePath('/llm-models');
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LlmModelsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; edit?: string; create?: string; saved?: string; created?: string }>;
}) {
  const { supabase } = await requireSuperadmin();
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10));
  const editId = params.edit ?? null;
  const showCreate = params.create === '1';
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: llmModels, count } = await supabase
    .from('llm_models')
    .select('id, name, llm_provider_id, provider_model_id, is_temperature_supported, created_datetime_utc', { count: 'exact' })
    .order('created_datetime_utc', { ascending: false })
    .range(from, to);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  // Fetch edit target if needed
  let editLlmModel: any = null;
  if (editId) {
    const { data } = await supabase
      .from('llm_models')
      .select('id, name, llm_provider_id, provider_model_id, is_temperature_supported')
      .eq('id', editId)
      .single();
    editLlmModel = data;
  }

  const showSavedToast = params.saved === '1' || params.created === '1';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'rgb(248 250 252)' }}>LLM Models</h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'rgb(148 163 184)' }}>
            {count ?? 0} total · page {page} of {totalPages || 1}
          </p>
        </div>
        <a
          href="/llm-models?create=1"
          className="button"
          style={{ textDecoration: 'none', fontSize: '0.8rem', padding: '0.45rem 1rem' }}
        >
          + New LLM Model
        </a>
      </header>

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
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'rgb(248 250 252)' }}>New LLM Model</h2>
              <a href="/llm-models" style={{ fontSize: '0.8rem', color: 'rgb(148 163 184)' }}>✕ Cancel</a>
            </div>
            <form action={createLlmModel} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgb(148 163 184)', marginBottom: '0.3rem' }}>
                  Model Name <span style={{ color: 'rgb(248 113 113)' }}>*</span>
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="e.g., GPT-4"
                  className="input"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgb(148 163 184)', marginBottom: '0.3rem' }}>
                  Provider ID
                </label>
                <input
                  name="llm_provider_id"
                  type="text"
                  placeholder="e.g., 1"
                  className="input"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgb(148 163 184)', marginBottom: '0.3rem' }}>
                  Provider Model ID
                </label>
                <input
                  name="provider_model_id"
                  type="text"
                  placeholder="e.g., gpt-4.1"
                  className="input"
                />
              </div>
              <div>
                <label className="pill-toggle">
                  <input type="hidden" name="is_temperature_supported" value="false" />
                  <input type="checkbox" name="is_temperature_supported" value="true" />
                  Supports temperature
                </label>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <a
                  href="/llm-models"
                  style={{ textDecoration: 'none', fontSize: '0.75rem', padding: '0.35rem 0.8rem', borderRadius: '999px', border: '1px solid rgba(148,163,184,0.6)', color: 'rgb(226 232 240)', background: 'rgba(15,23,42,0.85)', display: 'inline-flex', alignItems: 'center' }}
                >
                  Cancel
                </a>
                <button type="submit" className="button" style={{ fontSize: '0.8rem' }}>
                  Create LLM Model
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editLlmModel && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(2, 6, 23, 0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '32rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'rgb(248 250 252)' }}>Edit LLM Model</h2>
              <a href="/llm-models" style={{ fontSize: '0.8rem', color: 'rgb(148 163 184)' }}>✕ Cancel</a>
            </div>
            <form action={updateLlmModel} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input type="hidden" name="id" value={editLlmModel.id} />
              <input type="hidden" name="page" value={String(page)} />
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgb(148 163 184)', marginBottom: '0.3rem' }}>Model Name</label>
                <input name="name" type="text" defaultValue={editLlmModel.name ?? ''} className="input" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgb(148 163 184)', marginBottom: '0.3rem' }}>Provider ID</label>
                <input name="llm_provider_id" type="text" defaultValue={editLlmModel.llm_provider_id ?? ''} className="input" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgb(148 163 184)', marginBottom: '0.3rem' }}>Provider Model ID</label>
                <input name="provider_model_id" type="text" defaultValue={editLlmModel.provider_model_id ?? ''} className="input" />
              </div>
              <div>
                <label className="pill-toggle">
                  <input type="hidden" name="is_temperature_supported" value="false" />
                  <input
                    type="checkbox"
                    name="is_temperature_supported"
                    value="true"
                    defaultChecked={editLlmModel.is_temperature_supported}
                  />
                  Supports temperature
                </label>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <a href="/llm-models" className="button-secondary" style={{ textDecoration: 'none', fontSize: '0.75rem', padding: '0.35rem 0.8rem', borderRadius: '999px', border: '1px solid rgba(148,163,184,0.6)', color: 'rgb(226 232 240)', background: 'rgba(15,23,42,0.85)', display: 'inline-flex', alignItems: 'center' }}>Cancel</a>
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
                <th>Provider ID</th>
                <th>Provider Model ID</th>
                <th>Supports Temp</th>
                <th>Created At</th>
                <th>Updated At</th>
                <th style={{ width: '7rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!llmModels || llmModels.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'rgb(100 116 139)', padding: '2rem' }}>No LLM models found.</td>
                </tr>
              ) : llmModels.map((model: any) => (
                <tr key={model.id}>
                  <td>{model.id}</td>
                  <td style={{ maxWidth: '10rem' }}>
                    <div style={{ fontSize: '0.8rem', color: 'rgb(226 232 240)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {model.name || <span style={{ color: 'rgb(100 116 139)' }}>—</span>}
                    </div>
                  </td>
                  <td style={{ maxWidth: '10rem' }}>
                    <div style={{ fontSize: '0.8rem', color: 'rgb(226 232 240)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {model.llm_provider_id || <span style={{ color: 'rgb(100 116 139)' }}>—</span>}
                    </div>
                  </td>
                  <td style={{ maxWidth: '20rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'rgb(148 163 184)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {model.provider_model_id || <span style={{ color: 'rgb(100 116 139)' }}>—</span>}
                    </div>
                  </td>
                  <td>
                    {model.is_temperature_supported
                      ? <span className="badge badge-success">Yes</span>
                      : <span style={{ color: 'rgb(100 116 139)', fontSize: '0.75rem' }}>No</span>}
                  </td>
                  <td style={{ fontSize: '0.72rem', color: 'rgb(100 116 139)', whiteSpace: 'nowrap' }}>
                    {model.created_datetime_utc
                      ? new Date(model.created_datetime_utc).toLocaleDateString()
                      : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <a
                        href={`/llm-models?page=${page}&edit=${model.id}`}
                        style={{ fontSize: '0.72rem', color: 'rgb(56 189 248)', textDecoration: 'none', padding: '0.2rem 0.5rem', border: '1px solid rgba(56,189,248,0.35)', borderRadius: '0.375rem', background: 'rgba(56,189,248,0.08)', whiteSpace: 'nowrap' }}
                      >
                        Edit
                      </a>
                      <DeleteButton id={model.id} deleteAction={deleteLlmModel} />
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
              <a href={`/llm-models?page=${page - 1}`} className="pagination-btn">← Prev</a>
            )}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .map((p, idx, arr) => (
                <span key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && <span style={{ padding: '0 0.25rem', color: 'rgb(100 116 139)' }}>…</span>}
                  <a
                    href={`/llm-models?page=${p}`}
                    className={`pagination-btn${p === page ? ' pagination-btn-active' : ''}`}
                  >
                    {p}
                  </a>
                </span>
              ))}
            {page < totalPages && (
              <a href={`/llm-models?page=${page + 1}`} className="pagination-btn">Next →</a>
            )}
          </div>
        </div>
      </div>

      <Suspense><SavedToast /></Suspense>
    </div>
  );
}
