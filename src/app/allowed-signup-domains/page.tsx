import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireSuperadmin } from '../../lib/supabase/server';
import { Suspense } from 'react';
import DeleteButton from '../images/DeleteButton'; // Reusing DeleteButton
import SavedToast from '../images/SavedToast'; // Reusing SavedToast

const PAGE_SIZE = 50;

// ─── Server actions ───────────────────────────────────────────────────────────

async function updateAllowedSignupDomain(formData: FormData) {
  'use server';
  const { supabase, user } = await requireSuperadmin();

  await supabase
    .from('allowed_signup_domains')
    .update({
      apex_domain: (formData.get('apex_domain') as string) || null,
      modified_by_user_id: user.id,
    })
    .eq('id', formData.get('id') as string);

  const page = (formData.get('page') as string) || '1';
  revalidatePath('/allowed-signup-domains');
  redirect(`/allowed-signup-domains?page=${page}&saved=1`);
}

async function createAllowedSignupDomain(formData: FormData) {
  'use server';
  const { supabase, user } = await requireSuperadmin();

  await supabase.from('allowed_signup_domains').insert({
    apex_domain: (formData.get('apex_domain') as string) || null,
    created_by_user_id: user.id,
    modified_by_user_id: user.id,
  });

  revalidatePath('/allowed-signup-domains');
  redirect(`/allowed-signup-domains?created=1`);
}

async function deleteAllowedSignupDomain(formData: FormData) {
  'use server';
  const { supabase } = await requireSuperadmin();
  await supabase.from('allowed_signup_domains').delete().eq('id', formData.get('id') as string);
  revalidatePath('/allowed-signup-domains');
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AllowedSignupDomainsPage({
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

  const { data: allowedSignupDomains, count } = await supabase
    .from('allowed_signup_domains')
    .select('id, apex_domain, created_datetime_utc', { count: 'exact' })
    .order('created_datetime_utc', { ascending: false })
    .range(from, to);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  // Fetch edit target if needed
  let editAllowedSignupDomain: any = null;
  if (editId) {
    const { data } = await supabase
      .from('allowed_signup_domains')
      .select('id, apex_domain')
      .eq('id', editId)
      .single();
    editAllowedSignupDomain = data;
  }

  const showSavedToast = params.saved === '1' || params.created === '1';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'rgb(248 250 252)' }}>Allowed Signup Domains</h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'rgb(148 163 184)' }}>
            {count ?? 0} total · page {page} of {totalPages || 1}
          </p>
        </div>
        <a
          href="/allowed-signup-domains?create=1"
          className="button"
          style={{ textDecoration: 'none', fontSize: '0.8rem', padding: '0.45rem 1rem' }}
        >
          + New Allowed Signup Domain
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
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'rgb(248 250 252)' }}>New Allowed Signup Domain</h2>
              <a href="/allowed-signup-domains" style={{ fontSize: '0.8rem', color: 'rgb(148 163 184)' }}>✕ Cancel</a>
            </div>
            <form action={createAllowedSignupDomain} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgb(148 163 184)', marginBottom: '0.3rem' }}>
                  Domain <span style={{ color: 'rgb(248 113 113)' }}>*</span>
                </label>
                <input
                  name="apex_domain"
                  type="text"
                  required
                  placeholder="e.g., example.com"
                  className="input"
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <a
                  href="/allowed-signup-domains"
                  style={{ textDecoration: 'none', fontSize: '0.75rem', padding: '0.35rem 0.8rem', borderRadius: '999px', border: '1px solid rgba(148,163,184,0.6)', color: 'rgb(226 232 240)', background: 'rgba(15,23,42,0.85)', display: 'inline-flex', alignItems: 'center' }}
                >
                  Cancel
                </a>
                <button type="submit" className="button" style={{ fontSize: '0.8rem' }}>
                  Create Domain
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editAllowedSignupDomain && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(2, 6, 23, 0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '32rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'rgb(248 250 252)' }}>Edit Allowed Signup Domain</h2>
              <a href="/allowed-signup-domains" style={{ fontSize: '0.8rem', color: 'rgb(148 163 184)' }}>✕ Cancel</a>
            </div>
            <form action={updateAllowedSignupDomain} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input type="hidden" name="id" value={editAllowedSignupDomain.id} />
              <input type="hidden" name="page" value={String(page)} />
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgb(148 163 184)', marginBottom: '0.3rem' }}>Domain</label>
                <input name="apex_domain" type="text" defaultValue={editAllowedSignupDomain.apex_domain ?? ''} className="input" />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <a href="/allowed-signup-domains" className="button-secondary" style={{ textDecoration: 'none', fontSize: '0.75rem', padding: '0.35rem 0.8rem', borderRadius: '999px', border: '1px solid rgba(148,163,184,0.6)', color: 'rgb(226 232 240)', background: 'rgba(15,23,42,0.85)', display: 'inline-flex', alignItems: 'center' }}>Cancel</a>
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
                <th>Domain</th>
                <th>Created At</th>
                <th style={{ width: '7rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!allowedSignupDomains || allowedSignupDomains.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'rgb(100 116 139)', padding: '2rem' }}>No allowed signup domains found.</td>
                </tr>
              ) : allowedSignupDomains.map((domain: any) => (
                <tr key={domain.id}>
                  <td>{domain.id}</td>
                  <td style={{ maxWidth: '20rem' }}>
                    <div style={{ fontSize: '0.8rem', color: 'rgb(226 232 240)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {domain.apex_domain || <span style={{ color: 'rgb(100 116 139)' }}>—</span>}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.72rem', color: 'rgb(100 116 139)', whiteSpace: 'nowrap' }}>
                    {domain.created_datetime_utc
                      ? new Date(domain.created_datetime_utc).toLocaleDateString()
                      : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <a
                        href={`/allowed-signup-domains?page=${page}&edit=${domain.id}`}
                        style={{ fontSize: '0.72rem', color: 'rgb(56 189 248)', textDecoration: 'none', padding: '0.2rem 0.5rem', border: '1px solid rgba(56,189,248,0.35)', borderRadius: '0.375rem', background: 'rgba(56,189,248,0.08)', whiteSpace: 'nowrap' }}
                      >
                        Edit
                      </a>
                      <DeleteButton id={domain.id} deleteAction={deleteAllowedSignupDomain} />
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
              <a href={`/allowed-signup-domains?page=${page - 1}`} className="pagination-btn">← Prev</a>
            )}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .map((p, idx, arr) => (
                <span key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && <span style={{ padding: '0 0.25rem', color: 'rgb(100 116 139)' }}>…</span>}
                  <a
                    href={`/allowed-signup-domains?page=${p}`}
                    className={`pagination-btn${p === page ? ' pagination-btn-active' : ''}`}
                  >
                    {p}
                  </a>
                </span>
              ))}
            {page < totalPages && (
              <a href={`/allowed-signup-domains?page=${page + 1}`} className="pagination-btn">Next →</a>
            )}
          </div>
        </div>
      </div>

      <Suspense><SavedToast /></Suspense>
    </div>
  );
}
