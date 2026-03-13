import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireSuperadmin } from '../../lib/supabase/server';
import { Suspense } from 'react';
import DeleteButton from '../images/DeleteButton'; // Reusing DeleteButton
import SavedToast from '../images/SavedToast'; // Reusing SavedToast

const PAGE_SIZE = 50;

// ─── Server actions ───────────────────────────────────────────────────────────

async function updateWhitelistedEmail(formData: FormData) {
  'use server';
  const { supabase } = await requireSuperadmin();

  await supabase
    .from('whitelist_email_addresses')
    .update({
      email_address: (formData.get('email') as string) || null,
    })
    .eq('id', formData.get('id') as string);

  const page = (formData.get('page') as string) || '1';
  revalidatePath('/whitelisted-emails');
  redirect(`/whitelisted-emails?page=${page}&saved=1`);
}

async function createWhitelistedEmail(formData: FormData) {
  'use server';
  const { supabase } = await requireSuperadmin();

  await supabase.from('whitelist_email_addresses').insert({
    email_address: (formData.get('email') as string) || null,
  });

  revalidatePath('/whitelisted-emails');
  redirect(`/whitelisted-emails?created=1`);
}

async function deleteWhitelistedEmail(formData: FormData) {
  'use server';
  const { supabase } = await requireSuperadmin();
  await supabase.from('whitelist_email_addresses').delete().eq('id', formData.get('id') as string);
  revalidatePath('/whitelisted-emails');
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function WhitelistedEmailsPage({
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

  const { data: whitelistedEmails, count } = await supabase
    .from('whitelist_email_addresses')
    .select('id, email_address, created_datetime_utc, modified_datetime_utc', { count: 'exact' })
    .order('created_datetime_utc', { ascending: false })
    .range(from, to);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  // Fetch edit target if needed
  let editWhitelistedEmail: any = null;
  if (editId) {
    const { data } = await supabase
      .from('whitelist_email_addresses')
      .select('id, email_address')
      .eq('id', editId)
      .single();
    editWhitelistedEmail = data;
  }

  const showSavedToast = params.saved === '1' || params.created === '1';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'rgb(248 250 252)' }}>Whitelisted E-mail Addresses</h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'rgb(148 163 184)' }}>
            {count ?? 0} total · page {page} of {totalPages || 1}
          </p>
        </div>
        <a
          href="/whitelisted-emails?create=1"
          className="button"
          style={{ textDecoration: 'none', fontSize: '0.8rem', padding: '0.45rem 1rem' }}
        >
          + New Whitelisted E-mail Address
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
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'rgb(248 250 252)' }}>New Whitelisted E-mail Address</h2>
              <a href="/whitelisted-emails" style={{ fontSize: '0.8rem', color: 'rgb(148 163 184)' }}>✕ Cancel</a>
            </div>
            <form action={createWhitelistedEmail} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgb(148 163 184)', marginBottom: '0.3rem' }}>
                  E-mail Address <span style={{ color: 'rgb(248 113 113)' }}>*</span>
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="e.g., user@example.com"
                  className="input"
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <a
                  href="/whitelisted-emails"
                  style={{ textDecoration: 'none', fontSize: '0.75rem', padding: '0.35rem 0.8rem', borderRadius: '999px', border: '1px solid rgba(148,163,184,0.6)', color: 'rgb(226 232 240)', background: 'rgba(15,23,42,0.85)', display: 'inline-flex', alignItems: 'center' }}
                >
                  Cancel
                </a>
                <button type="submit" className="button" style={{ fontSize: '0.8rem' }}>
                  Add E-mail Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editWhitelistedEmail && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(2, 6, 23, 0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '32rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'rgb(248 250 252)' }}>Edit Whitelisted E-mail Address</h2>
              <a href="/whitelisted-emails" style={{ fontSize: '0.8rem', color: 'rgb(148 163 184)' }}>✕ Cancel</a>
            </div>
            <form action={updateWhitelistedEmail} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input type="hidden" name="id" value={editWhitelistedEmail.id} />
              <input type="hidden" name="page" value={String(page)} />
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgb(148 163 184)', marginBottom: '0.3rem' }}>E-mail Address</label>
                <input name="email" type="email" defaultValue={editWhitelistedEmail.email_address ?? ''} className="input" />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <a href="/whitelisted-emails" className="button-secondary" style={{ textDecoration: 'none', fontSize: '0.75rem', padding: '0.35rem 0.8rem', borderRadius: '999px', border: '1px solid rgba(148,163,184,0.6)', color: 'rgb(226 232 240)', background: 'rgba(15,23,42,0.85)', display: 'inline-flex', alignItems: 'center' }}>Cancel</a>
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
                <th>E-mail Address</th>
                <th>Created At</th>
                <th>Updated At</th>
                <th style={{ width: '7rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!whitelistedEmails || whitelistedEmails.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'rgb(100 116 139)', padding: '2rem' }}>No whitelisted e-mail addresses found.</td>
                </tr>
              ) : whitelistedEmails.map((email: any) => (
                <tr key={email.id}>
                  <td>{email.id}</td>
                  <td style={{ maxWidth: '20rem' }}>
                    <div style={{ fontSize: '0.8rem', color: 'rgb(226 232 240)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {email.email_address || <span style={{ color: 'rgb(100 116 139)' }}>—</span>}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.72rem', color: 'rgb(100 116 139)', whiteSpace: 'nowrap' }}>
                    {email.created_datetime_utc
                      ? new Date(email.created_datetime_utc).toLocaleDateString()
                      : '—'}
                  </td>
                  <td style={{ fontSize: '0.72rem', color: 'rgb(100 116 139)', whiteSpace: 'nowrap' }}>
                    {email.modified_datetime_utc
                      ? new Date(email.modified_datetime_utc).toLocaleDateString()
                      : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <a
                        href={`/whitelisted-emails?page=${page}&edit=${email.id}`}
                        style={{ fontSize: '0.72rem', color: 'rgb(56 189 248)', textDecoration: 'none', padding: '0.2rem 0.5rem', border: '1px solid rgba(56,189,248,0.35)', borderRadius: '0.375rem', background: 'rgba(56,189,248,0.08)', whiteSpace: 'nowrap' }}
                      >
                        Edit
                      </a>
                      <DeleteButton id={email.id} deleteAction={deleteWhitelistedEmail} />
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
              <a href={`/whitelisted-emails?page=${page - 1}`} className="pagination-btn">← Prev</a>
            )}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .map((p, idx, arr) => (
                <span key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && <span style={{ padding: '0 0.25rem', color: 'rgb(100 116 139)' }}>…</span>}
                  <a
                    href={`/whitelisted-emails?page=${p}`}
                    className={`pagination-btn${p === page ? ' pagination-btn-active' : ''}`}
                  >
                    {p}
                  </a>
                </span>
              ))}
            {page < totalPages && (
              <a href={`/whitelisted-emails?page=${page + 1}`} className="pagination-btn">Next →</a>
            )}
          </div>
        </div>
      </div>

      <Suspense><SavedToast /></Suspense>
    </div>
  );
}
