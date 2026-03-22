import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireSuperadmin } from '../../lib/supabase/server';
import { Suspense } from 'react';
import DeleteButton from './DeleteButton';
import SavedToast from './SavedToast';
import { v4 as uuidv4 } from 'uuid';
import { ImageUploadForm } from './ImageUploadForm';

const PAGE_SIZE = 50;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB soft limit for uploads

// ─── Server actions ───────────────────────────────────────────────────────────

async function updateImage(formData: FormData) {
  'use server';
  const { supabase, user } = await requireSuperadmin();

  await supabase
    .from('images')
    .update({
      image_description: (formData.get('image_description') as string) || null,
      additional_context: (formData.get('additional_context') as string) || null,
      is_common_use: formData.getAll('is_common_use').includes('true'),
      is_public: formData.getAll('is_public').includes('true'),
      modified_by_user_id: user.id,
    })
    .eq('id', formData.get('id') as string);

  const page = (formData.get('page') as string) || '1';
  revalidatePath('/images');
  redirect(`/images?page=${page}&saved=1`);
}

async function createImage(formData: FormData) {
  'use server';
  const { supabase, user } = await requireSuperadmin();

  const imageFile = formData.get('image_file') as File;
  let imageUrl: string | null = null;

  if (imageFile && imageFile.size > 0) {
    // Soft limit to avoid hitting the Next.js serverActions hard body size limit
    if (imageFile.size > MAX_IMAGE_BYTES) {
      // Redirect back to the create modal with an error flag
      redirect('/images?create=1&error=image_too_large');
    }

    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `public/${fileName}`; // Or adjust based on your bucket structure

    const { error: uploadError } = await supabase.storage
      .from('images') // Assuming your storage bucket is named 'images'
      .upload(filePath, imageFile, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading image:', uploadError.message);
      // Handle error, maybe redirect with an error message
      redirect(`/images?error=upload_failed`);
    }

    const { data: publicUrlData } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    imageUrl = publicUrlData.publicUrl;
  }

  await supabase.from('images').insert({
    url: imageUrl,
    image_description: (formData.get('image_description') as string) || null,
    additional_context: (formData.get('additional_context') as string) || null,
    is_common_use: formData.getAll('is_common_use').includes('true'),
    is_public: formData.getAll('is_public').includes('true'),
    profile_id: user.id,
    created_by_user_id: user.id,
    modified_by_user_id: user.id,
  });

  revalidatePath('/images');
  redirect(`/images?created=1`);
}

async function deleteImage(formData: FormData) {
  'use server';
  const { supabase } = await requireSuperadmin();
  await supabase.from('images').delete().eq('id', formData.get('id') as string);
  revalidatePath('/images');
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ImagesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    edit?: string;
    create?: string;
    saved?: string;
    created?: string;
    error?: string;
    q?: string;
    common?: string;
    public?: string;
  }>;
}) {
  const { supabase } = await requireSuperadmin();
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10));
  const editId = params.edit ?? null;
  const showCreate = params.create === '1';
  const searchQuery = (params.q ?? '').trim();
  const filterCommon = params.common === '1';
  const filterPublic = params.public === '1';
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from('images')
    .select(
      'id, url, image_description, additional_context, is_common_use, is_public, profile_id, celebrity_recognition, created_datetime_utc, modified_datetime_utc',
      { count: 'exact' },
    )
    .order('created_datetime_utc', { ascending: false }) as any;

  if (searchQuery) {
    query = query.ilike('image_description', `%${searchQuery}%`);
  }
  if (filterCommon) {
    query = query.eq('is_common_use', true);
  }
  if (filterPublic) {
    query = query.eq('is_public', true);
  }

  const { data: images, count } = await query.range(from, to);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  // Fetch edit target if needed
  let editImage: any = null;
  if (editId) {
    const { data } = await supabase
      .from('images')
      .select('id, url, image_description, additional_context, is_common_use, is_public')
      .eq('id', editId)
      .single();
    editImage = data;
  }

  const showSavedToast = params.saved === '1' || params.created === '1';
  const errorCode = params.error;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'rgb(248 250 252)' }}>Images</h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'rgb(148 163 184)' }}>
            {count ?? 0} total · page {page} of {totalPages || 1}
          </p>
        </div>
        <a
          href="/images?create=1"
          className="button"
          style={{ textDecoration: 'none', fontSize: '0.8rem', padding: '0.45rem 1rem' }}
        >
          + New Image
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
          placeholder="Filter by description…"
          className="input"
          style={{ maxWidth: '18rem' }}
        />
        <label className="pill-toggle">
          <input type="checkbox" name="common" value="1" defaultChecked={filterCommon} />
          Common use only
        </label>
        <label className="pill-toggle">
          <input type="checkbox" name="public" value="1" defaultChecked={filterPublic} />
          Public only
        </label>
        <button type="submit" className="button-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}>
          Apply
        </button>
        {(searchQuery || filterCommon || filterPublic) && (
          <a
            href="/images"
            className="button-secondary"
            style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem', textDecoration: 'none' }}
          >
            Clear
          </a>
        )}
      </form>

      {/* Error banner */}
      {errorCode === 'image_too_large' && (
        <div
          className="card"
          style={{
            border: '1px solid rgba(248,113,113,0.4)',
            background: 'rgba(30,64,175,0.25)',
            color: 'rgb(248 250 252)',
            fontSize: '0.8rem',
          }}
        >
          <strong style={{ color: 'rgb(248 113 113)' }}>Upload too large.</strong>{' '}
          Please choose an image smaller than 10 MB.
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
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'rgb(248 250 252)' }}>New Image</h2>
              <a href="/images" style={{ fontSize: '0.8rem', color: 'rgb(148 163 184)' }}>✕ Cancel</a>
            </div>
            <ImageUploadForm action={createImage} />
          </div>
        </div>
      )}

      {/* Edit modal (inline, server-rendered) */}
      {editImage && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(2, 6, 23, 0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '32rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'rgb(248 250 252)' }}>Edit Image</h2>
              <a href="/images" style={{ fontSize: '0.8rem', color: 'rgb(148 163 184)' }}>✕ Cancel</a>
            </div>
            {editImage.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={editImage.url} alt="preview" style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '0.5rem', border: '1px solid rgba(51,65,85,0.9)' }} />
            )}
            <form action={updateImage} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input type="hidden" name="id" value={editImage.id} />
              <input type="hidden" name="page" value={String(page)} />
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgb(148 163 184)', marginBottom: '0.3rem' }}>Image description</label>
                <textarea name="image_description" defaultValue={editImage.image_description ?? ''} rows={3} className="input" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgb(148 163 184)', marginBottom: '0.3rem' }}>Additional context</label>
                <textarea name="additional_context" defaultValue={editImage.additional_context ?? ''} rows={2} className="input" />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label className="pill-toggle">
                  <input type="hidden" name="is_common_use" value="false" />
                  <input type="checkbox" name="is_common_use" value="true" defaultChecked={editImage.is_common_use} />
                  Common use
                </label>
                <label className="pill-toggle">
                  <input type="hidden" name="is_public" value="false" />
                  <input type="checkbox" name="is_public" value="true" defaultChecked={editImage.is_public} />
                  Public
                </label>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <a href="/images" className="button-secondary" style={{ textDecoration: 'none', fontSize: '0.75rem', padding: '0.35rem 0.8rem', borderRadius: '999px', border: '1px solid rgba(148,163,184,0.6)', color: 'rgb(226 232 240)', background: 'rgba(15,23,42,0.85)', display: 'inline-flex', alignItems: 'center' }}>Cancel</a>
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
                <th style={{ width: '3.5rem' }}>Preview</th>
                <th>Description</th>
                <th>Context</th>
                <th>Common Use</th>
                <th>Public</th>
                <th>Uploaded</th>
                <th style={{ width: '7rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!images || images.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'rgb(100 116 139)', padding: '2rem' }}>No images found.</td>
                </tr>
              ) : images.map((img: any) => (
                <tr key={img.id}>
                  <td>
                    {img.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img.url}
                        alt="thumb"
                        style={{ width: '3rem', height: '2.25rem', objectFit: 'cover', borderRadius: '0.25rem', border: '1px solid rgba(51,65,85,0.9)', display: 'block' }}
                      />
                    ) : (
                      <div style={{ width: '3rem', height: '2.25rem', borderRadius: '0.25rem', background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(51,65,85,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: 'rgb(100 116 139)' }}>
                        None
                      </div>
                    )}
                  </td>
                  <td style={{ maxWidth: '14rem' }}>
                    <div style={{ fontSize: '0.8rem', color: 'rgb(226 232 240)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {img.image_description || <span style={{ color: 'rgb(100 116 139)' }}>—</span>}
                    </div>
                  </td>
                  <td style={{ maxWidth: '12rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'rgb(148 163 184)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {img.additional_context || <span style={{ color: 'rgb(100 116 139)' }}>—</span>}
                    </div>
                  </td>
                  <td>
                    {img.is_common_use
                      ? <span className="badge badge-success">Yes</span>
                      : <span style={{ color: 'rgb(100 116 139)', fontSize: '0.75rem' }}>No</span>}
                  </td>
                  <td>
                    {img.is_public
                      ? <span className="badge badge-success">Yes</span>
                      : <span style={{ color: 'rgb(100 116 139)', fontSize: '0.75rem' }}>No</span>}
                  </td>
                  <td style={{ fontSize: '0.72rem', color: 'rgb(100 116 139)', whiteSpace: 'nowrap' }}>
                    {img.created_datetime_utc
                      ? new Date(img.created_datetime_utc).toLocaleDateString()
                      : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <a
                        href={`/images?page=${page}&edit=${img.id}`}
                        style={{ fontSize: '0.72rem', color: 'rgb(56 189 248)', textDecoration: 'none', padding: '0.2rem 0.5rem', border: '1px solid rgba(56,189,248,0.35)', borderRadius: '0.375rem', background: 'rgba(56,189,248,0.08)', whiteSpace: 'nowrap' }}
                      >
                        Edit
                      </a>
                      <DeleteButton id={img.id} deleteAction={deleteImage} />
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
                href={`/images?page=${page - 1}${
                  searchQuery || filterCommon || filterPublic
                    ? `${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}${
                        filterCommon ? '&common=1' : ''
                      }${filterPublic ? '&public=1' : ''}`
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
                    href={`/images?page=${p}${
                      searchQuery || filterCommon || filterPublic
                        ? `${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}${
                            filterCommon ? '&common=1' : ''
                          }${filterPublic ? '&public=1' : ''}`
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
                href={`/images?page=${page + 1}${
                  searchQuery || filterCommon || filterPublic
                    ? `${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}${
                        filterCommon ? '&common=1' : ''
                      }${filterPublic ? '&public=1' : ''}`
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
